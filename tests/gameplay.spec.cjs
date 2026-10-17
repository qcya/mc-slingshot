const {test,expect}=require('@playwright/test');const {ready,shot,restart,chooseLevel}=require('./browser-helpers.cjs');
test('三种弹药实际发射，方块落稳，TNT延迟爆炸，珍珠穿墙',async({page})=>{
 await ready(page,{level:2});const reports=[];
 for(const [slot,id] of [[1,'cobble'],[2,'tnt'],[3,'ender']]){
  await restart(page);await shot(page,slot);await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(1);
  if(id==='tnt')await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().explosions),{timeout:7000}).toBe(1);
  else if(id==='ender')await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().portals),{timeout:6000}).toBeGreaterThan(0);
  else await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().removed),{timeout:7000}).toBeGreaterThan(0);
  await page.locator('#stage').screenshot({path:`evidence/ammo-${id}.png`});expect(await page.evaluate(()=>MCBlockLaunch.getDiagnostics().sound.failed)).toBe(0);
  if(id==='cobble')await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().restingBlocks),{timeout:14000}).toBeGreaterThan(0);
  reports.push({kind:id,...await page.evaluate(()=>MCBlockLaunch.getDiagnostics())});
 }require('node:fs').writeFileSync('evidence/weapons.json',JSON.stringify(reports,null,2));
});
test('五关完整起步，攻击前后画面、重开库存与刚体数量可核验',async({page})=>{
 test.setTimeout(90000);await ready(page);const errors=[],failed=[],reports=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 for(let i=0;i<5;i++){
  if(i)await chooseLevel(page,i);const before=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(before.enemiesAlive).toBe([1,3,4,4,5][i]);expect(before.terrainPixels%256).toBe(0);
  await page.locator('#stage').screenshot({path:`evidence/level-${i+1}-initial.png`});await shot(page,i?2:1);
  if(i)await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().explosions),{timeout:7000}).toBe(1);else await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().removed),{timeout:7000}).toBeGreaterThan(0);
  await page.waitForTimeout(500);await page.locator('#stage').screenshot({path:`evidence/level-${i+1}-after.png`});reports.push(await page.evaluate(()=>MCBlockLaunch.getDiagnostics()));await restart(page);
  const reset=await page.evaluate(()=>MCBlockLaunch.getStatus());expect(reset.bodies).toBe(before.bodies);expect(reset.inventory).toEqual(before.inventory);
 }expect(errors).toEqual([]);expect(failed).toEqual([]);require('node:fs').writeFileSync('evidence/levels.json',JSON.stringify(reports,null,2));
});
