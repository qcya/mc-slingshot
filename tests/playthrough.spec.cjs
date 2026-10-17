const {test,expect}=require('@playwright/test');const {ready,shot}=require('./browser-helpers.cjs');
test('新存档锁关，实际圆石通关解锁TNT，第二关解锁珍珠并保存',async({page})=>{
 test.setTimeout(150000);await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);
 await expect(page.locator('#level-1')).toBeDisabled();await expect(page.locator('#level-2')).toBeDisabled();expect(await page.evaluate(()=>MCBlockLaunch.playLevel(4))).toBe(false);
 await page.locator('#level-0').click();const reports=[],plans=require('../evidence/playability-search.json');
 for(const level of [0,1]){
  for(const move of plans[level].history){
   if(await page.evaluate(()=>MCBlockLaunch.getStatus().ended))break;const before=await page.evaluate(()=>MCBlockLaunch.getStatus()),power=move.pull??1;
   await shot(page,{cobble:1,tnt:2,ender:3}[move.kind],135*power*Math.cos(move.angle),135*power*Math.sin(move.angle));
   await page.waitForFunction(t=>MCBlockLaunch.getStatus().time>=t+6.15||MCBlockLaunch.getStatus().ended,before.time,{timeout:11000});
  }
  await expect(page.locator('#resultFlag')).toHaveText('挑战成功',{timeout:12000});
  await expect(page.locator('#resultTitle')).toContainText(level===0?'TNT':'末影珍珠');
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().unlocked)).toBe(level+2);
  await page.screenshot({path:`evidence/campaign-reward-${level+1}.png`});reports.push(await page.evaluate(()=>MCBlockLaunch.getDiagnostics()));
  if(level===0){await page.locator('#nextBtn').click();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().inventory)).toEqual([4,1,0]);}
 }
 await page.reload();await page.waitForFunction(()=>window.MCBlockLaunch);await expect(page.locator('#level-2')).toBeEnabled();await expect(page.locator('#level-3')).toBeDisabled();
 require('node:fs').writeFileSync('evidence/browser-victories.json',JSON.stringify(reports,null,2));
});
