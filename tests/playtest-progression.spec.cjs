const {test,expect}=require('@playwright/test');
async function boot(page,times,netherTimes=[],endTimes=[]){
 await page.addInitScript(({times,netherTimes,endTimes})=>{
  localStorage.setItem('mc-block-launch.profile.v1',JSON.stringify({nickname:'Playtest',id:'browser-test',token:'browser-only'}));
  localStorage.setItem('mc-block-launch.campaign.v1',JSON.stringify({unlocked:10,completed:[0,1,2,3,4,5,6,7,8,9]}));
  localStorage.setItem('mc-block-launch.best-times.v1',JSON.stringify(Array(10).fill(1000)));
  localStorage.setItem('mc-block-launch.best-times.v2',JSON.stringify(times));
  localStorage.setItem('mc-block-launch.best-times.v2.nether',JSON.stringify(netherTimes));
  localStorage.setItem('mc-block-launch.best-times.v2.end',JSON.stringify(endTimes));
 },{times,netherTimes,endTimes});
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
test('clearing only Overworld unlocks Nether but keeps End locked, even with an old End record',async({page})=>{
 await boot(page,Array(10).fill(1000),[],[2000]);
 await expect(page.locator('#levelMenu [data-world="nether"]')).toBeEnabled();
 await expect(page.locator('#levelMenu [data-world="end"]')).toBeDisabled();
 expect(await page.evaluate(()=>MCBlockLaunch.switchWorld('end'))).toBe(false);
 // Viewing a locked world's ranking must not bypass its gameplay gate.
 await page.locator('#leaderboardBtn').click();await page.locator('#leaderboardMenu [data-world="end"]').click();
 expect(await page.evaluate(()=>MCBlockLaunch.playLevel(0))).toBe(false);
 await page.locator('#leaderboardBack').click();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().dimension)).toBe('overworld');
});

test('nine cleared Nether stages still do not unlock End',async({page})=>{
 await boot(page,Array(10).fill(1000),Array(9).fill(1000));
 await expect(page.locator('#levelMenu [data-world="end"]')).toBeDisabled();
});

test('clearing both preceding worlds unlocks End at its first stage',async({page})=>{
 await boot(page,Array(10).fill(1000),Array(10).fill(1000));
 await expect(page.locator('#levelMenu [data-world="end"]')).toBeEnabled();await page.locator('#levelMenu [data-world="end"]').click();
 await expect(page.locator('#level-0')).toBeEnabled();await expect(page.locator('#level-1')).toBeDisabled();
});

test('a newly unlocked Nether starts at stage one',async({page})=>{
 await boot(page,Array(10).fill(1000));
 for(const id of ['nether']){
  await expect(page.locator(`#levelMenu [data-world="${id}"]`)).toBeEnabled();await page.locator(`#levelMenu [data-world="${id}"]`).click();
  await expect(page.locator('#level-0')).toBeEnabled();await expect(page.locator('#level-1')).toBeDisabled();
 }
});
