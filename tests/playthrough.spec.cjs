const {test,expect}=require('@playwright/test');
const M=require('../vendor/matter.min.js');
function aimAt(enemy){
 let best={angle:.44,error:Infinity};
 for(let angle=.16;angle<1.13;angle+=.02){
  const engine=M.Engine.create({gravity:{x:0,y:1,scale:.001}}),b=M.Bodies.circle(205+Math.cos(.91)*98,607-Math.sin(.91)*98,12,{frictionAir:.0015});M.Composite.add(engine.world,b);
  const dx=135*Math.cos(angle),dy=Math.min(103,135*Math.sin(angle));M.Body.setPosition(b,{x:205-dx,y:545+dy});
  M.Body.setVelocity(b,{x:Math.min(1430,dx*10.8)/60,y:Math.max(-1200,-dy*10.8)/60});
  for(let i=0;i<360;i++){
   M.Engine.update(engine,1000/120);if(b.position.x>=enemy.x){const error=Math.abs(b.position.y-enemy.y);if(error<best.error)best={angle,error};break;}
   if(b.position.y>1000)break;
  }M.Composite.clear(engine.world,false);M.Engine.clear(engine);
 }return best;
}
test('实际鼠标高抛与黑洞攻击可以完成木屋、哨塔挑战',async({page})=>{
 test.setTimeout(150000);await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);
 const reports=[];
 const plans=require('../evidence/playability-search.json');
 for(const level of [0,1]){
  await page.getByLabel('选择关卡',{exact:true}).selectOption(String(level));
  const played=[];
  for(let turn=0;turn<8;turn++){
  if(await page.evaluate(()=>MCBlockLaunch.getStatus().enemiesAlive===0))break;
  if(await page.evaluate(()=>MCBlockLaunch.getStatus().shots===0))break;
  let shot=plans[level].history[turn];
  if(!shot){const enemy=await page.evaluate(()=>MCBlockLaunch.getDiagnostics().enemies.find(e=>e.alive)),aim=aimAt(enemy);shot={kind:aim.error<65?'ender':'blackhole',angle:aim.angle};}
  const angle=shot.angle,kind={cobble:1,tnt:2,ender:3,blackhole:4}[shot.kind];await page.keyboard.press(String(kind));
  const b=await page.locator('#stage').boundingBox(),s=await page.evaluate(()=>MCBlockLaunch.getStatus()),p=s.launcher;
  const x=b.x+p.x*b.width/1536,y=b.y+p.y*b.height/864;
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(x-135*Math.cos(angle)*b.width/1536,y+135*Math.sin(angle)*b.height/864,{steps:12});await page.mouse.up();
  await page.waitForFunction(time=>MCBlockLaunch.getStatus().time>=time+6.4||MCBlockLaunch.getStatus().enemiesAlive===0,s.time,{timeout:11000});
  played.push({...shot,after:await page.evaluate(()=>MCBlockLaunch.getDiagnostics())});
  require('node:fs').writeFileSync(`evidence/browser-attempt-${level+1}.json`,JSON.stringify(played,null,2));
  }
  await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().enemiesAlive),{timeout:12000}).toBe(0);
  await expect(page.locator('#resultFlag')).toHaveText('挑战成功');
  await page.screenshot({path:`evidence/level-${level+1}-victory.png`});reports.push({played,...await page.evaluate(()=>MCBlockLaunch.getDiagnostics())});
 }
 require('node:fs').writeFileSync('evidence/browser-victories.json',JSON.stringify(reports,null,2));
});
