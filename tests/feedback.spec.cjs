const {test,expect}=require('@playwright/test');const {ready,aim}=require('./browser-helpers.cjs');
test('独立堆叠库存、方块三面图标、物品栏自动隐藏及滚轮唤回',async({page})=>{
 await ready(page,{level:1});expect(await page.locator('#ballbar button').count()).toBe(3);expect(await page.locator('.topbar,#ammo').count()).toBe(0);
 expect(await page.evaluate(()=>MCBlockLaunch.getStatus().inventory)).toEqual([5,1,0,0]);expect(await page.locator('#ballbar .stack-count').nth(0).textContent()).toBe('5');
 expect(await page.locator('#ballbar img').nth(0).evaluate(e=>e.naturalWidth)).toBe(64);
 await page.screenshot({path:'evidence/hotbar-first-slot.png'});
 await expect(page.locator('#inventory')).toHaveClass(/tucked/,{timeout:5000});await page.locator('#stage').hover({position:{x:500,y:100}});await page.mouse.wheel(0,-120);
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().selectedSlot)).toBe(1);await expect(page.locator('#inventory')).not.toHaveClass(/tucked/);
 await page.screenshot({path:'evidence/hotbar-last-slot.png'});const before=await page.evaluate(()=>MCBlockLaunch.getStatus().inventory);await aim(page,-50,20);await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.mouse.up();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().inventory)).toEqual(before);
});
test('ESC 冻结物理且取消蓄力，云在游戏中移动，人物继续巡逻',async({page})=>{
 await ready(page,{level:2});await aim(page,-80,50);await page.keyboard.press('Escape');await page.mouse.up();await expect(page.locator('#pauseMenu')).toBeVisible();
 const time=await page.evaluate(()=>MCBlockLaunch.getStatus().time);await page.waitForTimeout(250);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().time)).toBe(time);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(0);
 await page.keyboard.press('Escape');const cloud=()=>page.evaluate(()=>Array.from(document.querySelector('#stage').getContext('2d').getImageData(390,30,400,110).data));
 const sky=await cloud();await page.waitForTimeout(1700);expect(await cloud()).not.toEqual(sky);
 const d=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(d.enemies.some(e=>e.walkDistance>2)).toBe(true);await page.screenshot({path:'evidence/gameplay-overview.png'});
 require('node:fs').writeFileSync('evidence/feedback.json',JSON.stringify(d,null,2));
});
