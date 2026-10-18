const {test,expect}=require('@playwright/test');const {ready,aim}=require('./browser-helpers.cjs');
test('default Sweden music plays after a gesture, loops quietly, and can be switched off independently',async({page})=>{
 await ready(page);await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().music?.playing)).toBe(true);
 const before=await page.evaluate(()=>MCBlockLaunch.getDiagnostics().music);expect(before.track).toBe('C418 — Sweden');expect(before.loop).toBe(true);expect(before.volume).toBe(.18);
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().music.duration)).toBeGreaterThan(180);
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().music.time)).toBeGreaterThan(.2);
 await aim(page,-95,30);const box=await page.locator('#stage').boundingBox(),scale=box.width/1536;
 await page.screenshot({path:'evidence/sling-inner-band.png',clip:{x:box.x+140*scale,y:box.y+480*scale,width:250*scale,height:215*scale}});await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.mouse.up();
 await page.keyboard.press('Escape');await page.locator('#settingsBtn').click();await page.locator('#musicToggle').click();await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().music.playing)).toBe(false);
 await expect(page.locator('#soundToggle')).toHaveText('音效：开');await page.reload();await page.waitForFunction(()=>window.MCBlockLaunch);await require('./browser-helpers.cjs').enterStart(page);expect((await page.evaluate(()=>MCBlockLaunch.getDiagnostics().music)).enabled).toBe(false);
 await page.locator('#level-0').click();await page.keyboard.press('Escape');await page.locator('#settingsBtn').click();await page.locator('#musicToggle').click();await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().music.playing)).toBe(true);
 expect((await page.evaluate(()=>MCBlockLaunch.getDiagnostics().music)).lastError).toBe('');
});
