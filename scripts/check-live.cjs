// Optional deployment smoke check; never submits a leaderboard score.
const {chromium}=require('@playwright/test'),fs=require('node:fs');
async function main(){
 const url=process.argv[2];if(!url)throw Error('Usage: node scripts/check-live.cjs http://192.168.1.4:8770/');
 const browser=await chromium.launch({channel:process.env.CI?undefined:'msedge'}),reports=[];
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1536,height:1100},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[],failed=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
   await page.goto(url);await page.waitForFunction(()=>window.MCBlockLaunch);
   if(await page.title()!=='MC打弹弓 · MC Slingshot'||await page.locator('#levelMenu h1').textContent()!=='MC打弹弓')throw Error('Game rename not deployed.');
   await page.locator('#nickname').fill(`D${Date.now().toString(36)}${mobile?'M':'P'}`);await page.locator('#saveProfile').click();await page.locator('#levelMenu').waitFor({state:'visible'});
   await page.locator('#leaderboardBtn').click();await page.waitForFunction(()=>!document.querySelector('#leaderboardStatus').textContent.startsWith('正在'));
   if(!await page.locator('#rankingTable').isVisible()||await page.locator('#rankingRows tr').count()>100||await page.locator('#rankingRows tr.self').count())throw Error('Public ranking visibility or full-clear/top-100 restriction failed.');
   const sample=page.locator('#rankingRows tr').filter({has:page.locator('.demo-badge')});if(await sample.count()!==1||!(await sample.textContent()).includes('星海')||!(await sample.textContent()).includes('06:37.000'))throw Error('Live demo entry mismatch.');
   await page.screenshot({path:`evidence/live-${mobile?'android':'desktop'}-ranking.png`});await page.locator('#leaderboardBack').click();await page.locator('#level-0').click();
   const box=await page.locator('#stage').boundingBox(),p=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher),x=box.x+p.x*box.width/1536,y=box.y+p.y*box.height/864;
   if(mobile){
    const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-38,y:y+18,id:1}]});
    await page.waitForFunction(()=>MCBlockLaunch.getDiagnostics().preview.length===5);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-38,y:y+18,id:1},{x:box.x+box.width*.8,y:box.y+box.height*.2,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.locator('#touchPause').tap();if(await page.locator('#touchPause').textContent()!=='暂停菜单')throw Error('Mobile pause label mismatch.');await page.locator('#resume').tap();
   }else{
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-80,y+35,{steps:8});await page.waitForFunction(()=>MCBlockLaunch.getDiagnostics().preview.length===5);await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.mouse.up();
   }
   await page.waitForFunction(()=>MCBlockLaunch.getDiagnostics().music?.playing&&MCBlockLaunch.getDiagnostics().music.time>.2);
   const status=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());if(status.launched!==0||status.launcher.phase!=='ready'||status.physics!=='Matter.js'||status.music.lastError||status.music.duration<180||errors.length||failed.length)throw Error(JSON.stringify({status,errors,failed}));
   await page.screenshot({path:`evidence/live-${mobile?'android':'desktop'}-play.png`});reports.push({mobile,url,physics:status.physics,screen:status.screen,previewPoints:5,cancelledWithoutFiring:status.launched===0,music:status.music,errors,failed});await context.close();
  }
  fs.writeFileSync('evidence/live-browser.json',JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
