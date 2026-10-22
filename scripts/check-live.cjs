// Read-only deployment smoke check: real public board, isolated browser identity.
const {chromium}=require('@playwright/test'),fs=require('node:fs');
async function main(){
 const url=process.argv[2];if(!url)throw Error('Usage: node scripts/check-live.cjs http://192.168.1.4:8770/');
 const browser=await chromium.launch({channel:process.env.CI?undefined:'msedge'}),reports=[];
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1536,height:1100},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[],failed=[];
   const previewIdentity={id:'deployment-preview',nickname:'试玩检查',token:'browser-only'};
   await context.addInitScript(profile=>localStorage.setItem('mc-block-launch.profile.v1',JSON.stringify(profile)),previewIdentity);
   const blockedWrites=[];
   await page.route('**/api/**',route=>{
    const request=route.request();
    if(request.method()!=='GET'){blockedWrites.push(request.method()+' '+new URL(request.url()).pathname);return route.abort();}
    if(new URL(request.url()).pathname.endsWith('/api/profile'))return route.fulfill({json:{profile:previewIdentity}});
    return route.continue();
   });
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
   await page.goto(url);await page.waitForFunction(()=>window.MCBlockLaunch);
   if(await page.title()!=='拉满的石 · Stone at Full Draw'||await page.locator('#levelMenu h1').textContent()!=='选择关卡')throw Error('Game title/menu not deployed.');
   await page.locator('#startScreen').click();await page.locator('#levelMenu').waitFor({state:'visible'});
   await page.locator('#leaderboardBtn').click();const boards=[];
   for(const id of ['overworld','nether','end']){
    await page.locator(`#leaderboardMenu [data-world="${id}"]`).click();await page.waitForFunction(()=>!document.querySelector('#leaderboardStatus').textContent.startsWith('正在'));
    const message=await page.locator('#leaderboardStatus').textContent();
    if(!await page.locator('#rankingTable').isVisible()||await page.locator('#rankingRows tr').count()>100||await page.locator('#rankingRows tr.self').count()||message.includes('连接不上'))throw Error('Public ranking failed: '+id+' '+message);
    boards.push({world:id,rows:await page.locator('#rankingRows tr').count(),status:message});
   }
   await page.screenshot({path:`evidence/live-${mobile?'android':'desktop'}-ranking.png`});await page.locator('#leaderboardBack').click();await page.locator('#levelMenu [data-world="overworld"]').click();await page.locator('#level-0').click();
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
   const status=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());if(status.launched!==0||status.launcher.phase!=='ready'||status.physics!=='Matter.js'||status.music.lastError||status.music.duration<180||errors.length||failed.length||blockedWrites.length)throw Error(JSON.stringify({status,errors,failed,blockedWrites}));
   await page.screenshot({path:`evidence/live-${mobile?'android':'desktop'}-play.png`});reports.push({mobile,url,boards,physics:status.physics,screen:status.screen,previewPoints:5,cancelledWithoutFiring:status.launched===0,serverWrites:blockedWrites.length,music:status.music,errors,failed});await context.close();
  }
  fs.writeFileSync('evidence/live-browser.json',JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
