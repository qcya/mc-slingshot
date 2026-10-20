const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createGameServer}=require('../scripts/serve.cjs');
const {aim,enterStart}=require('./browser-helpers.cjs');
let server,directory,base,AMMO,inventoryFor,worldSaveKey,TIME_SAVE_KEY,TIME_QUEUE_KEY,formatTime,TOY_DIMENSIONS_CLOUD_KEY,TOY_CLOUD_KEY,encodeTime;

test.beforeAll(async()=>{
 ({AMMO}=await import('../src/config.mjs'));({inventoryFor}=await import('../src/campaign.mjs'));
 ({worldSaveKey}=await import('../src/dimensions.mjs'));({TIME_SAVE_KEY,TIME_QUEUE_KEY,formatTime}=await import('../src/timing.mjs'));
 ({TOY_DIMENSIONS_CLOUD_KEY,TOY_CLOUD_KEY}=await import('../src/toy-storage.mjs'));({encodeTime}=await import('../src/toy-online.mjs'));
 directory=await fs.mkdtemp(path.join(os.tmpdir(),'mc-dimension-playthrough-'));
 server=await createGameServer({dataDir:directory});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{server?.closeAllConnections();if(server)await new Promise(resolve=>server.close(resolve));if(directory)await fs.rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});

async function platform(page,session){
 await page.exposeFunction('dimensionReadCloud',()=>session.cloud);
 await page.exposeFunction('dimensionWriteCloud',values=>{session.cloud={...session.cloud,...values};});
 await page.exposeFunction('dimensionSubmitScore',params=>{session.submissions.push(params);session.scores[params.board]=params.score;return params;});
 await page.exposeFunction('dimensionOwnScore',params=>({score:session.scores[params.board]||0}));
 await page.addInitScript(({account,nickname})=>{
  globalThis.MC_PLATFORM={toy:true,ranking:'toy'};
  globalThis.toy={getUserProfile:async()=>({toyOpenId:account,nickname}),getCloudStorage:()=>window.dimensionReadCloud(),setCloudStorage:values=>window.dimensionWriteCloud(values),getMyRank:p=>window.dimensionOwnScore(p),submitScore:p=>window.dimensionSubmitScore(p),getRankList:async()=>({list:[]})};
 },session);
}
async function launch(page,move){
 const slot=AMMO.findIndex(ammo=>ammo.id===move.kind);
 await page.keyboard.press(String(slot+1));
 expect((await page.evaluate(()=>MCBlockLaunch.getStatus())).selected).toBe(move.kind);
 const before=await page.evaluate(()=>MCBlockLaunch.getStatus());
 await aim(page,move.input.x-before.launcher.x,move.input.y-before.launcher.y);
 const pulled=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher);
 expect(Math.hypot(pulled.x-move.origin.x,pulled.y-move.origin.y)).toBeLessThan(.001);
 expect(Math.abs(pulled.vx-move.vx)).toBeLessThan(.0001);expect(Math.abs(pulled.vy-move.vy)).toBeLessThan(.0001);
 await page.mouse.up();
 const fired=await page.evaluate(()=>MCBlockLaunch.getStatus());
 expect(fired.launched).toBe(before.launched+1);expect(fired.inventory[slot]).toBe(before.inventory[slot]-1);
 await page.clock.runFor((move.wait??6)*1000);
 while(await page.evaluate(time=>!MCBlockLaunch.getStatus().ended&&MCBlockLaunch.getStatus().time<time-1e-6,before.time+(move.wait??6)))await page.clock.runFor(9);
 return {input:move.input,launcher:pulled,beforeTime:before.time,after:await page.evaluate(()=>MCBlockLaunch.getStatus())};
}

for(const world of ['nether','end'])test.describe.serial(`${world} complete native campaign`,()=>{
 let context,page,session;const reports=[],plans=require(`../evidence/${world}-playability.json`);
 test.beforeAll(async({browser})=>{
  session={account:`browser-${world}`,nickname:`Browser ${world}`,cloud:{[TOY_CLOUD_KEY]:JSON.stringify({version:1,values:{[TIME_SAVE_KEY]:JSON.stringify(Array(10).fill(1000))}})},submissions:[],scores:{2:encodeTime(10000)}};
  context=await browser.newContext({viewport:{width:1536,height:1100}});page=await context.newPage();
  await platform(page,session);await page.clock.install({time:new Date('2026-10-20T00:00:00Z')});
  await page.goto(base);await page.waitForFunction(()=>window.MCBlockLaunch);await enterStart(page);await expect(page.locator('#levelMenu')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.locator(`#levelMenu [data-world="${world}"]`).click();await expect(page.locator('#level-0')).toBeEnabled();await expect(page.locator('#level-1')).toBeDisabled();
  await page.screenshot({path:`evidence/dimension-browser-${world}-source-menu.png`});
 });
 test.afterAll(async()=>{if(reports.length)await fs.writeFile(`evidence/dimension-browser-${world}.json`,JSON.stringify({world,stages:reports,submissions:session.submissions},null,2));await context?.close();});
 for(const plan of plans)test(`${world} stage ${plan.level}: mouse launch, finite inventory, result and world save`,async({browser})=>{
  test.setTimeout(120000);
  if(plan.level===1)await page.locator('#level-0').click();else await page.locator('#nextBtn').click();
  expect((await page.evaluate(()=>MCBlockLaunch.getStatus())).inventory).toEqual(inventoryFor(plan.level-1,world));
  const timeline=[];for(const move of plan.history){if((await page.evaluate(()=>MCBlockLaunch.getStatus())).ended)break;timeline.push(await launch(page,move));}
  await page.clock.runFor(1400);const final=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());
  await fs.writeFile(`evidence/dimension-browser-${world}-${plan.level}.json`,JSON.stringify({world,level:plan.level,timeline,final},null,2));
  expect(final.enemiesAlive).toBe(0);expect(final.screen).toBe('result');expect(final.dimension).toBe(world);expect(final.inventory.every(count=>count>=0)).toBe(true);
  await expect(page.locator('#resultFlag')).toHaveText('挑战成功');await expect(page.locator('#resultTiming')).toContainText('本次用时');await expect(page.locator('#resultTiming')).toContainText('个人最快');
  const prefix=`mc-slingshot.toy.${encodeURIComponent(session.account)}.`,timeKey=worldSaveKey(TIME_SAVE_KEY,world),progressKey=worldSaveKey('mc-block-launch.campaign.v1',world);
  const saved=await page.evaluate(({prefix,timeKey,progressKey,TIME_SAVE_KEY})=>({times:JSON.parse(localStorage.getItem(prefix+timeKey)),progress:JSON.parse(localStorage.getItem(prefix+progressKey)),overworld:localStorage.getItem(prefix+TIME_SAVE_KEY)}),{prefix,timeKey,progressKey,TIME_SAVE_KEY});
  expect(saved.progress.completed).toEqual(Array.from({length:plan.level},(_,i)=>i));expect(saved.progress.unlocked).toBe(Math.min(10,plan.level+1));
  expect(saved.times.filter(Number.isInteger)).toHaveLength(plan.level);expect(saved.times[plan.level-1]).toBe(Math.round(final.time*1000));expect(JSON.parse(saved.overworld)).toEqual(Array(10).fill(1000));
  await expect(page.locator('#resultTiming')).toContainText(formatTime(saved.times[plan.level-1]));
  await expect.poll(()=>JSON.parse(session.cloud[TOY_DIMENSIONS_CLOUD_KEY]||'{"values":{}}').values[timeKey]).toBe(JSON.stringify(saved.times));
  const other=world==='nether'?'end':'nether';expect(JSON.parse(session.cloud[TOY_DIMENSIONS_CLOUD_KEY]).values[worldSaveKey(TIME_SAVE_KEY,other)]).toBeUndefined();
  if(plan.level<10)expect(session.submissions).toEqual([]);
  await page.screenshot({path:`evidence/dimension-browser-${world}-clear-${plan.level}.png`});reports.push({level:plan.level,shots:final.launched,remaining:final.inventory,timeMs:saved.times[plan.level-1]});
  if(plan.level===10){
   await expect.poll(()=>session.submissions.length).toBe(1);expect(session.submissions[0].board).toBe(world==='nether'?3:4);
   expect(session.submissions[0].score).toBe(10000000-Math.ceil(saved.times.reduce((a,b)=>a+b,0)/10));
   expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),prefix+worldSaveKey(TIME_QUEUE_KEY,world))).toEqual([]);
   await page.locator('#resultLevels').click();await page.screenshot({path:`evidence/dimension-browser-${world}-complete-menu.png`});
   const restoredContext=await browser.newContext({viewport:{width:1536,height:1100}}),restored=await restoredContext.newPage();
   try{await platform(restored,session);await restored.goto(base);await restored.waitForFunction(()=>window.MCBlockLaunch);await enterStart(restored);await restored.locator(`#levelMenu [data-world="${world}"]`).click();await restored.locator('#nextPage').click();await expect(restored.locator('#level-9')).toBeEnabled();await expect(restored.locator('#level-9')).toContainText(formatTime(saved.times[9]));expect(await restored.evaluate(key=>localStorage.getItem(key),prefix+timeKey)).toBe(JSON.stringify(saved.times));}finally{await restoredContext.close();}
  }
 });
});
