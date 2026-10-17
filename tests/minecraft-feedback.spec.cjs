const {test,expect}=require('@playwright/test');const {ready,shot,shotPlan,chooseLevel}=require('./browser-helpers.cjs');

test('原版灰色按钮和泥土选关背景加载，四种弹药在弹弓上尺寸一致',async({page})=>{
 await ready(page,{level:3});
 for(const [key,name] of [[1,'cobble'],[2,'tnt'],[3,'ender'],[4,'fire']]){
  await page.keyboard.press(String(key));
  const b=await page.locator('#stage').boundingBox();
  await page.screenshot({path:`evidence/sling-${name}.png`,clip:{x:b.x+180*b.width/1536,y:b.y+480*b.height/864,width:210*b.width/1536,height:205*b.height/864}});
 }
 await page.keyboard.press('Escape');await page.locator('#levelMenuBtn').click();
 expect(await page.locator('#levelMenu').evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('dirt.png');
 expect(await page.locator('#level-0').evaluate(e=>getComputedStyle(e).borderImageSource)).toContain('/button.png');
 for(const name of ['button','button_highlighted','button_disabled'])expect(await page.evaluate(async n=>{const im=new Image();im.src=`assets/gui/${n}.png`;await im.decode();return [im.naturalWidth,im.naturalHeight];},name)).toEqual([200,20]);
 await page.mouse.move(10,10);await page.screenshot({path:'evidence/minecraft-menu.png'});
});

test('十关真实鼠标发射在限定库存内通关，包括新增地窖中的怪物',async({page})=>{
 test.setTimeout(180000);const submitted=[];page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api/results'))submitted.push(r.postDataJSON());});await page.clock.install({time:new Date('2026-10-17T12:00:00Z')});await ready(page);
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 const plans=require('../evidence/playability-search.json'),reports=[];
 for(const plan of plans.filter(p=>!process.env.MC_REPLAY_LEVEL||p.level===Number(process.env.MC_REPLAY_LEVEL))){
  if(plan.level>1)await chooseLevel(page,plan.level-1);
  const timeline=[];for(const move of plan.history){
   if((await page.evaluate(()=>MCBlockLaunch.getStatus())).ended)break;
   const launch=await shotPlan(page,move);
   await page.clock.runFor((move.wait??6)*1000);
   // The first RAF initializes its timestamp without stepping Matter. Wait for
   // simulation time, rather than shortening the first shot by one display frame.
   while(await page.evaluate(t=>!MCBlockLaunch.getStatus().ended&&MCBlockLaunch.getStatus().time<t-1e-6,launch.time+(move.wait??6)))await page.clock.runFor(9);
   timeline.push({...await page.evaluate(()=>MCBlockLaunch.getDiagnostics()),launch});
  }
  await page.clock.runFor(1400);const d=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());
  require('node:fs').writeFileSync(`evidence/replay-${plan.level}.json`,JSON.stringify({timeline,final:d},null,2));expect(d.enemiesAlive,`level ${plan.level}`).toBe(0);expect(d.screen).toBe('result');expect(d.inventory.every(n=>n>=0)).toBe(true);
  await expect(page.locator('#resultFlag')).toHaveText('挑战成功');await page.screenshot({path:`evidence/campaign-clear-${plan.level}.png`});reports.push(d);
  if(plan.level<10)expect(submitted).toEqual([]);
 }
 if(!process.env.MC_REPLAY_LEVEL){
  await expect.poll(()=>submitted.length).toBeGreaterThan(0);expect(submitted.every(s=>s.stages.length===10&&s.stages.every(t=>Object.keys(t).sort().join(',')==='stage,timeMs'))).toBe(true);
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('mc-block-launch.profile.v1'))),response=await page.request.get('/api/profile',{headers:{Authorization:`Bearer ${profile.token}`}});expect((await response.json()).stages.length).toBe(10);
 }
 require('node:fs').writeFileSync('evidence/ten-browser-victories.json',JSON.stringify(reports,null,2));
});

test('真实圆石击杀依次显示红闪、倒地和白色消散，全部结束后才显示胜利',async({page})=>{
 test.setTimeout(45000);await page.clock.install({time:new Date('2026-10-17T12:00:00Z')});await ready(page,{unlocked:1});
 await page.clock.pauseAt(new Date('2026-10-17T12:00:02Z'));
 const plan=require('../evidence/playability-search.json')[0].history[0];
 await shot(page,1,135*plan.pull*Math.cos(plan.angle),135*plan.pull*Math.sin(plan.angle));
 let d;
 for(let i=0;i<240;i++){await page.clock.runFor(16);d=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());if(!d.enemies[0].alive)break;}
 expect(d.enemies[0].alive).toBe(false);expect(d.enemies[0].appearance.hurt).toBe(true);expect(d.screen).toBe('play');
 await page.locator('#stage').screenshot({path:'evidence/mob-hurt.png'});
 await page.clock.runFor(410);d=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(Math.abs(d.enemies[0].appearance.angle)).toBeGreaterThan(1.4);expect(d.enemies[0].dead).toBe(false);
 await page.locator('#stage').screenshot({path:'evidence/mob-fallen.png'});
 await page.clock.runFor(300);d=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(d.enemies[0].dead).toBe(true);expect(d.whiteParticles).toBeGreaterThan(0);expect(d.screen).toBe('play');
 await page.locator('#stage').screenshot({path:'evidence/mob-poof.png'});
 await page.clock.runFor(600);d=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(d.whiteParticles).toBe(0);expect(d.screen).toBe('result');
 require('node:fs').writeFileSync('evidence/mob-death.json',JSON.stringify(d,null,2));
});
