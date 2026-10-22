const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {buildToy}=require('../scripts/build-toy.cjs'),{aim}=require('./browser-helpers.cjs');

test('extracted Toy package opens directly from file URL with native draw and release sounds',async({page})=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mc-toy-file-')),build=buildToy({output:path.join(temp,'site')}),errors=[],blocked=[];
 try{
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>blocked.push({url:r.url(),failure:r.failure()?.errorText}));
  await page.goto(pathToFileURL(path.join(build.output,'index.html')).href);
  await expect(page.locator('#loadState')).toBeHidden({timeout:12000});await expect(page.locator('#startScreen')).toBeVisible();
  await page.locator('#guideBtn').click();await expect(page.locator('#itemGuide article')).toHaveCount(9);await page.locator('#guideBack').click();
  await page.locator('#startScreen').click();if(await page.locator('#profileMenu').isVisible()){await page.locator('#nickname').fill('Local tester');await page.locator('#saveProfile').click();}
  await expect(page.locator('#levelMenu')).toBeVisible();await page.locator('#level-0').click();
  const pointer=await aim(page,-115,25),bounds=await page.locator('#stage').boundingBox();let moves=0;
  await expect.poll(async()=>{
   await page.mouse.move(pointer.x-(115+(moves++%2))*bounds.width/1536,pointer.y+25*bounds.height/864);await page.waitForTimeout(40);
   return page.evaluate(()=>MCBlockLaunch.getDiagnostics().drawSound.signalRms);
  }).toBeGreaterThan(.0001);
  expect(await page.evaluate(()=>MCBlockLaunch.getDiagnostics().drawSound.failed)).toBe(false);await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().sound.played.bow||0)).toBeGreaterThan(0);
  const diagnostics=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(diagnostics.launched).toBe(1);expect(errors).toEqual([]);
  // Native media may cancel its metadata range when playback starts. That is
  // distinct from a blocked file fetch, which reports ERR_FAILED.
  expect(blocked.filter(r=>!(r.failure==='net::ERR_ABORTED'&&r.url.endsWith('/assets/music/sweden.ogg')))).toEqual([]);
  expect(diagnostics.music.lastError).toBe('');
  expect(await page.locator('#stage').evaluate(c=>c.getContext('2d').getImageData(0,0,1,1).data.length)).toBe(4);
  await fs.promises.mkdir('evidence/review-0.13.4',{recursive:true});
  await page.screenshot({path:'evidence/review-0.13.4/local-file-play.png'});await fs.promises.writeFile('evidence/review-0.13.4/local-file.json',JSON.stringify({protocol:'file:',drawSound:diagnostics.drawSound,sound:diagnostics.sound,launched:diagnostics.launched,errors,blocked},null,2));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
