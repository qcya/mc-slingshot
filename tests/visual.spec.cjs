const {test,expect}=require('@playwright/test');const {ready}=require('./browser-helpers.cjs');
test('窄窗口菜单可操作，游戏没有顶部按钮和共享数量，物品栏完整显示',async({page})=>{
 await page.setViewportSize({width:600,height:690});await ready(page);expect(await page.locator('.topbar,#ammo').count()).toBe(0);
 const bar=await page.locator('#ballbar').boundingBox(),root=await page.locator('#gameRoot').boundingBox();expect(bar.y+bar.height).toBeLessThan(root.y+root.height);expect(bar.x).toBeGreaterThan(root.x);
 await page.screenshot({path:'evidence/visual-small-window.png'});await page.keyboard.press('Escape');await expect(page.locator('#pauseMenu')).toBeVisible();await page.screenshot({path:'evidence/campaign-pause-small.png'});
});
