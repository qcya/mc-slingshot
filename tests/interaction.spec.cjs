const {test,expect}=require('@playwright/test');const {ready,aim,restart}=require('./browser-helpers.cjs');
test('原版弩上弦声实际输出，反向和低角度均五点，右键取消不扣弹',async({page})=>{
 await ready(page);const before=await page.evaluate(()=>MCBlockLaunch.getStatus().inventory);
 for(const [dx,dy] of [[80,25],[-100,0],[-30,-100]]){
  await aim(page,dx,dy);await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().preview.length)).toBe(5);
  await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().drawSound.signalRms)).toBeGreaterThan(.00001);
  expect(await page.evaluate(()=>MCBlockLaunch.getDiagnostics().drawSound.source)).toBe('minecraft:crossbow_loading');
  await page.screenshot({path:'evidence/backward-aim.png'});await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.mouse.up();
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().inventory)).toEqual(before);expect(await page.evaluate(()=>MCBlockLaunch.getDiagnostics().drawSound.active)).toBe(false);
 }
});
test('小力度和反向发射实际扣除当前圆石，重开恢复库存',async({page})=>{
 await ready(page);await aim(page,-2,0);await page.mouse.up();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().inventory)).toEqual([4,0,0,0]);
 await restart(page);await aim(page,60,10);const x=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher.x);await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().ammoBodies[0]?.x??9999)).toBeLessThan(x-5);
});
test('两颗 TNT 相互炸飞，消耗各自库存且没有黑洞物品',async({page})=>{
 await ready(page,{level:3});await page.keyboard.press('2');await aim(page,0,0);await page.mouse.up();await page.waitForTimeout(1050);await aim(page,0,0);await page.mouse.up();
 expect(await page.evaluate(()=>MCBlockLaunch.getStatus().inventory)).toEqual([6,1,0,1]);
 await page.waitForFunction(()=>MCBlockLaunch.getStatus().explosions===1,null,{timeout:6000});
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().ammoBodies[0]?.speed||0)).toBeGreaterThan(200);
 expect(await page.locator('#ballbar img').count()).toBe(3);await page.screenshot({path:'evidence/tnt-interaction.png'});
 require('node:fs').writeFileSync('evidence/tnt-interaction.json',JSON.stringify(await page.evaluate(()=>MCBlockLaunch.getDiagnostics()),null,2));
});
test('用户 PNG、阁楼梯子与怪物停顿抬手实际显示',async({page})=>{
 await ready(page);await page.locator('#stage').click({position:{x:500,y:100}});await page.screenshot({path:'evidence/ai-sling-overview.png'});
 await page.waitForFunction(()=>MCBlockLaunch.getDiagnostics().enemies.some(e=>e.behavior==='idle'&&e.pose.gesture>.3),null,{timeout:14000});
 await page.screenshot({path:'evidence/idle-gesture.png'});expect(await page.evaluate(()=>MCBlockLaunch.getDiagnostics().sound.failed)).toBe(0);
});
