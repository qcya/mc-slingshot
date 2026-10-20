const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createGameServer}=require('../scripts/serve.cjs');
let server,directory,base,TIME_SAVE_KEY,TIME_QUEUE_KEY;
test.beforeAll(async()=>{
 ({TIME_SAVE_KEY,TIME_QUEUE_KEY}=await import('../src/timing.mjs'));
 directory=await fs.mkdtemp(path.join(os.tmpdir(),'mc-dimension-browser-'));
 server=await createGameServer({dataDir:directory});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{server?.closeAllConnections();if(server)await new Promise(resolve=>server.close(resolve));if(directory)await fs.rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
async function identity(name){const response=await fetch(base+'/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:name})});return response.json();}
async function boot(page,player,values={}){
 await page.addInitScript(({player,values})=>{if(localStorage.getItem('mc-block-launch.profile.v1'))return;localStorage.setItem('mc-block-launch.profile.v1',JSON.stringify({...player.profile,token:player.token}));for(const [key,value]of Object.entries(values))localStorage.setItem(key,JSON.stringify(value));},{player,values});
 await page.goto(base);await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#startScreen').click();await expect(page.locator('#levelMenu')).toBeVisible();
}
const bundle=timeMs=>({stages:Array.from({length:10},(_,stage)=>({stage,timeMs}))});
test('world selection preserves old overworld progress while ignoring old season times and queues',async({page})=>{
 const player=await identity('FreshSeason');
 await boot(page,player,{'mc-block-launch.campaign.v1':{unlocked:4,completed:[0,1,2]},'mc-block-launch.best-times.v1':Array(10).fill(1000),'mc-block-launch.pending.v2':[bundle(1000)]});
 await expect(page.locator('#level-3')).toBeEnabled();await expect(page.locator('#level-4')).toBeDisabled();
 await expect(page.locator('#level-0')).not.toContainText('00:01.000');
 for(const world of ['nether','end']){
  await page.locator(`#levelMenu [data-world="${world}"]`).click();
  await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().dimension)).toBe(world);
  await expect(page.locator('#level-0')).toBeEnabled();await expect(page.locator('#level-1')).toBeDisabled();
 }
 await page.locator('#levelMenu [data-world="overworld"]').click();await expect(page.locator('#level-3')).toBeEnabled();
 for(const world of ['overworld','nether','end'])expect((await (await fetch(`${base}/api/leaderboard?world=${world}`)).json()).entries.some(row=>row.id===player.profile.id)).toBe(false);
 expect(await page.evaluate(key=>localStorage.getItem(key),TIME_SAVE_KEY)).toBeNull();
});
test('three offline queues upload to separate boards and reload without mixing times',async({page})=>{
 const player=await identity('ThreeQueues'),values={};
 for(const [world,time]of [['overworld',3000],['nether',2000],['end',1000]]){const suffix=world==='overworld'?'':'.'+world;values[TIME_QUEUE_KEY+suffix]=[bundle(time)];values[TIME_SAVE_KEY+suffix]=Array(10).fill(time);}
 await boot(page,player,values);
 for(const [world,total]of [['overworld',30000],['nether',20000],['end',10000]])await expect.poll(async()=>{const data=await(await fetch(`${base}/api/leaderboard?world=${world}`)).json();return data.entries.find(row=>row.id===player.profile.id)?.totalTimeMs;}).toBe(total);
 await page.reload();await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#startScreen').click();
 await page.locator('#leaderboardBtn').click();
 for(const [world,time]of [['overworld','00:30.000'],['nether','00:20.000'],['end','00:10.000']]){
  await page.locator(`#leaderboardMenu [data-world="${world}"]`).click();await expect(page.locator('#rankingRows tr').filter({hasText:player.profile.nickname})).toContainText(time);
 }
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),TIME_QUEUE_KEY+'.end')).toEqual([]);
});
test('an old leaderboard response cannot replace the newly selected world',async({page})=>{
 const player=await identity('WorldRace');let release,started;
 const startedPromise=new Promise(resolve=>started=resolve),released=new Promise(resolve=>release=resolve);
 await page.route('**/api/leaderboard*',async route=>{
  const world=new URL(route.request().url()).searchParams.get('world')||'overworld';if(world==='overworld'){started();await released;}
  await route.fulfill({json:{entries:[{id:world,rank:1,nickname:world,completed:10,totalTimeMs:10000}]}});
 });
 await boot(page,player);await page.locator('#leaderboardBtn').click();await startedPromise;
 await page.locator('#leaderboardMenu [data-world="nether"]').click();await expect(page.locator('#rankingRows')).toContainText('nether');
 const oldResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/leaderboard'&&!new URL(response.url()).searchParams.has('world'));
 release();await oldResponse;await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.locator('#rankingRows tr')).toHaveCount(1);await expect(page.locator('#rankingRows')).not.toContainText('overworld');
});
