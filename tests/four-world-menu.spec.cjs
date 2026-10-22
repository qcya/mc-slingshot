const {test,expect}=require('@playwright/test');
test('five rank tabs are independent of four sequential gameplay worlds',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('mc-block-launch.profile.v1',JSON.stringify({id:'menu',token:'menu',nickname:'Menu'}));localStorage.setItem('mc-block-launch.best-times.v2',JSON.stringify(Array(10).fill(1000)));localStorage.setItem('mc-block-launch.best-times.v2.nether',JSON.stringify(Array(10).fill(1000)));});
 await page.route('**/api/**',r=>r.fulfill({json:r.request().url().includes('/health')?{scoreSeason:'three-dimensions-v2',worlds:['overworld','nether','end','sift'],rankings:['total']}:{profile:{id:'menu',nickname:'Menu'},stages:[],entries:[],entry:{}}}));
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#startScreen').click();
 await expect(page.locator('#levelMenu [data-world="end"]')).toBeEnabled();await expect(page.locator('#levelMenu [data-world="sift"]')).toBeDisabled();
 await page.locator('#leaderboardBtn').click();await expect(page.locator('#leaderboardMenu [data-world]')).toHaveCount(5);
 await page.locator('#leaderboardMenu [data-world="total"]').click();await expect(page.locator('#rankingTitle')).toHaveText('四界总榜');
 await page.locator('#leaderboardMenu [data-world="sift"]').click();await expect(page.locator('#rankingTitle')).toHaveText('筛界排行榜');
 await page.locator('#leaderboardBack').click();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().dimension)).toBe('overworld');expect(errors).toEqual([]);
});
