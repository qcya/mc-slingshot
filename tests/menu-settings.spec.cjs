const{test,expect}=require('@playwright/test');const{ready}=require('./browser-helpers.cjs');
test('recorded times, full level titles and item buttons fit one centered line at every menu size',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('mc-block-launch.best-times.v1',JSON.stringify([4058,14625,30875,17217,49450,39417,44967,59542,39258,133667])));await ready(page);await page.keyboard.press('Escape');await page.locator('#levelMenuBtn').click();
 for(const size of [{width:1536,height:1100},{width:1000,height:700},{width:670,height:520},{width:568,height:320},{width:390,height:844},{width:320,height:568}]){
  await page.setViewportSize(size);
  for(let n=0;n<2;n++){
   for(const row of await page.locator('.level-card-wrap').all()){
    const boxes=await Promise.all(['.level-number','strong','.personal-best','.loadout-info'].map(s=>row.locator(s).boundingBox()));
    const centers=boxes.map(b=>b.y+b.height/2);expect(Math.max(...centers)-Math.min(...centers)).toBeLessThan(2);
    for(let i=1;i<boxes.length;i++)expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i-1].x+boxes[i-1].width);
    expect(await row.locator('strong').evaluate(e=>e.scrollWidth<=e.clientWidth&&e.clientHeight>=parseFloat(getComputedStyle(e).fontSize))).toBe(true);
   }
   if(n===0)await page.locator('#nextPage').click();else await page.locator('#prevPage').click();
  }
  if(size.width===670)await page.screenshot({path:'evidence/one-line-level-menu.png'});if(size.width===320)await page.screenshot({path:'evidence/one-line-level-menu-phone.png'});
 }
});
test('five vertical world buttons per page in landscape and portrait',async({page})=>{
 await ready(page);await page.keyboard.press('Escape');await page.locator('#levelMenuBtn').click();
 for(const size of [{width:1000,height:700},{width:390,height:844}]){await page.setViewportSize(size);await expect(page.locator('#levelCards .level-card')).toHaveCount(5);const cards=await page.locator('.level-card').all(),boxes=await Promise.all(cards.map(c=>c.boundingBox()));for(let i=1;i<5;i++){expect(Math.abs(boxes[i].x-boxes[0].x)).toBeLessThan(1);expect(boxes[i].y).toBeGreaterThan(boxes[i-1].y+boxes[i-1].height);}expect(boxes[0].width/boxes[0].height).toBeGreaterThan(5);await page.locator('#nextPage').click();await expect(page.locator('#level-9')).toBeVisible();await expect(page.locator('#level-0')).toHaveCount(0);await page.locator('#prevPage').click();await expect(page.locator('#level-0')).toBeVisible();}
 await page.screenshot({path:'evidence/beta-world-menu-portrait.png'});
});
test('pause presents five actions, settings pause physics and sound volume persists',async({page})=>{
 await ready(page);await page.keyboard.press('Escape');expect(await page.locator('#pauseMenu button').allTextContents()).toEqual(['继续游戏','重新开始','设置','选择关卡','返回主菜单']);await page.locator('#settingsBtn').click();await expect(page.locator('#settingsMenu')).toBeVisible();const time=await page.evaluate(()=>MCBlockLaunch.getStatus().time);await page.locator('#sfxVolume').fill('55');await expect(page.locator('#sfxValue')).toHaveText('55%');expect(await page.evaluate(()=>MCBlockLaunch.getDiagnostics().sound.volume)).toBe(.55);await page.waitForTimeout(200);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().time)).toBe(time);await page.keyboard.press('Escape');await expect(page.locator('#pauseMenu')).toBeVisible();await page.locator('#pauseHomeBtn').click();await expect(page.locator('#startScreen')).toBeVisible();await page.reload();await page.waitForFunction(()=>window.MCBlockLaunch);expect(await page.evaluate(()=>MCBlockLaunch.getDiagnostics().sound.volume)).toBe(.55);
});
test('fullscreen button reflects browser entry and exit',async({page})=>{
 await ready(page);await page.keyboard.press('Escape');await page.locator('#levelMenuBtn').click();await page.locator('#fullscreenBtn').click();await expect(page.locator('#fullscreenBtn')).toHaveText('取消全屏');await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);await page.locator('#fullscreenBtn').click();await expect(page.locator('#fullscreenBtn')).toHaveText('全屏');await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
});
test('unsupported orientation hint cannot block fullscreen reentry after an external exit',async({page})=>{
 await page.setViewportSize({width:1000,height:700});await page.addInitScript(()=>{screen.orientation.lock=async()=>{throw Error('unsupported');};});await ready(page);await page.keyboard.press('Escape');await page.locator('#levelMenuBtn').click();await page.locator('#fullscreenBtn').click();await expect(page.locator('#fullscreenStatus')).toBeVisible();expect(await page.locator('#fullscreenStatus').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');await page.evaluate(()=>document.exitFullscreen());await expect(page.locator('#fullscreenStatus')).toBeHidden();await page.locator('#fullscreenBtn').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
});
test('first-column material popup remains inside the narrow landscape panel',async({page})=>{
 await page.setViewportSize({width:568,height:320});await ready(page);await page.keyboard.press('Escape');await page.locator('#levelMenuBtn').click();await page.locator('#nextPage').click();for(const name of await page.locator('.level-card strong').all()){const box=await name.boundingBox();expect(box.height).toBeGreaterThan(10);expect(box.width).toBeGreaterThan(40);}expect((await page.locator('#fullscreenBtn').boundingBox()).y+26).toBeLessThanOrEqual(320);await page.locator('[data-loadout-level="5"]').click();const tip=await page.locator('#loadout-5').boundingBox(),panel=await page.locator('.campaign-panel').boundingBox();expect(tip.x).toBeGreaterThanOrEqual(panel.x-1);expect(tip.x+tip.width).toBeLessThanOrEqual(panel.x+panel.width+1);
});
