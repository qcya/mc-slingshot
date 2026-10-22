const {test,expect}=require('@playwright/test');const {ready,shotPlan}=require('./browser-helpers.cjs');
test('a first clear shows run and best times and the menu preserves its best',async({page})=>{
 await page.clock.install({time:new Date('2026-10-18T00:00:00Z')});await ready(page,{unlocked:1});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await shotPlan(page,require('../evidence/playability-search.json')[0].history[0]);await page.clock.runFor(8000);await expect(page.locator('#resultTiming')).toContainText('本次用时');await expect(page.locator('#resultTiming')).toContainText('个人最快');
 const times=await page.evaluate(()=>JSON.parse(localStorage.getItem('mc-block-launch.best-times.v2')));await page.locator('#resultLevels').click();await expect(page.locator('#level-0')).toContainText('最快');await expect(page.locator('#level-0')).toContainText((times[0]/1000).toFixed(3).padStart(6,'0'));
});

test('touch loadout disclosure closes on the second tap',async({browser})=>{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const page=await context.newPage();await ready(page,{level:7});await page.locator('#touchPause').tap();await page.locator('#levelMenuBtn').tap();
 await page.locator('[data-loadout-level="7"]').tap();await expect(page.locator('#loadout-7')).toBeVisible();await page.locator('[data-loadout-level="7"]').tap();await expect(page.locator('#loadout-7')).toBeHidden();await context.close();
});
test('loadout information is click-only and the hotbar uses nine permanent slots',async({page})=>{
 await ready(page,{level:7});await expect(page.locator('#ballbar button')).toHaveCount(9);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().selected)).toBe('cobble');
 await page.keyboard.press('3');expect(await page.evaluate(()=>MCBlockLaunch.getStatus().selected)).toBe('ender');await page.keyboard.press('4');expect(await page.evaluate(()=>MCBlockLaunch.getStatus().selected)).toBe('fire');
 await page.keyboard.press('Escape');await page.locator('#levelMenuBtn').click();await page.locator('[data-loadout-level="7"]').click();await expect(page.locator('#loadout-7')).toBeVisible();await expect(page.locator('#loadout-7')).toContainText('烈焰弹');
 await page.screenshot({path:'evidence/personal-best-loadout.png'});
});
