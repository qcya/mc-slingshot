const {test,expect}=require('@playwright/test');
async function boot(page,times){
 await page.addInitScript(times=>{
  localStorage.setItem('mc-block-launch.profile.v1',JSON.stringify({nickname:'Playtest',id:'browser-test',token:'browser-only'}));
  localStorage.setItem('mc-block-launch.campaign.v1',JSON.stringify({unlocked:10,completed:[0,1,2,3,4,5,6,7,8,9]}));
  localStorage.setItem('mc-block-launch.best-times.v1',JSON.stringify(Array(10).fill(1000)));
  localStorage.setItem('mc-block-launch.best-times.v2',JSON.stringify(times));
 },times);
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const json=path.endsWith('/health')?{ok:true,scoreSeason:'three-dimensions-v2',worlds:['overworld','nether','end']}:path.endsWith('/profile')?{profile:{nickname:'Playtest'},stages:[]}:path.endsWith('/leaderboard')?{entries:[]}:{entry:{}};
  return route.fulfill({json});
 });
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#startScreen').click();
}
test('legacy unlock flags cannot open uncleared rebuilt stages or other worlds',async({page})=>{
 await boot(page,[7317]);
 await expect(page.locator('#level-0')).toBeEnabled();await expect(page.locator('#level-1')).toBeEnabled();await expect(page.locator('#level-2')).toBeDisabled();
 for(const id of ['nether','end'])await expect(page.locator(`#levelMenu [data-world="${id}"]`)).toBeDisabled();
 expect(await page.evaluate(()=>MCBlockLaunch.switchWorld('nether'))).toBe(false);
 expect(await page.evaluate(()=>MCBlockLaunch.playLevel(2))).toBe(false);
 expect(await page.evaluate(()=>MCBlockLaunch.playLevel(2,true))).toBe(false);
});
test('a fully cleared current Overworld opens both new dimensions, each starting at stage one',async({page})=>{
 await boot(page,Array(10).fill(1000));
 for(const id of ['nether','end']){
  await expect(page.locator(`#levelMenu [data-world="${id}"]`)).toBeEnabled();await page.locator(`#levelMenu [data-world="${id}"]`).click();
  await expect(page.locator('#level-0')).toBeEnabled();await expect(page.locator('#level-1')).toBeDisabled();
 }
});
