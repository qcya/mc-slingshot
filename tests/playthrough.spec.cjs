const {test,expect}=require('@playwright/test');const {ready,shotPlan}=require('./browser-helpers.cjs');
test('新存档锁关，实际圆石通关解锁TNT，第二关解锁珍珠并保存',async({page})=>{
 test.setTimeout(150000);await page.clock.install({time:new Date('2026-10-17T12:00:00Z')});await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#nickname').fill('Campaign Tester');await page.locator('#saveProfile').click();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.locator('#level-1')).toBeDisabled();await expect(page.locator('#level-2')).toBeDisabled();expect(await page.evaluate(()=>MCBlockLaunch.playLevel(4))).toBe(false);
 await page.locator('#level-0').click();const reports=[],plans=require('../evidence/playability-search.json');
 for(const level of [0,1]){
  for(const move of plans[level].history){
   if(await page.evaluate(()=>MCBlockLaunch.getStatus().ended))break;const before=await page.evaluate(()=>MCBlockLaunch.getStatus()),power=move.pull??1;
   await shotPlan(page,move);
   const target=before.time+(move.wait??6);await page.clock.runFor((move.wait??6)*1000);while(await page.evaluate(t=>!MCBlockLaunch.getStatus().ended&&MCBlockLaunch.getStatus().time<t-1e-6,target))await page.clock.runFor(9);
  }
  await page.clock.runFor(1400);
  await expect(page.locator('#resultFlag')).toHaveText('挑战成功',{timeout:12000});
  await expect(page.locator('#resultTitle')).toContainText(level===0?'TNT':'末影珍珠');
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().unlocked)).toBe(level+2);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mc-block-launch.best-times.v1')).filter(Number.isInteger).length)).toBe(level+1);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mc-block-launch.pending.v2')||'[]'))).toEqual([]);
  await page.screenshot({path:`evidence/campaign-reward-${level+1}.png`});reports.push(await page.evaluate(()=>MCBlockLaunch.getDiagnostics()));
  if(level===0){await page.locator('#nextBtn').click();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().inventory)).toEqual([3,1,0,0]);}
 }
 await page.reload();await page.waitForFunction(()=>window.MCBlockLaunch);await expect(page.locator('#level-2')).toBeEnabled();await expect(page.locator('#level-3')).toBeDisabled();
 require('node:fs').writeFileSync('evidence/browser-victories.json',JSON.stringify(reports,null,2));
});
