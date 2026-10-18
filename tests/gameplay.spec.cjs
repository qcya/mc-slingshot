const {test,expect}=require('@playwright/test');const {ready,shot,restart,chooseLevel}=require('./browser-helpers.cjs');
test('?????????????????????????????????',async({page})=>{
 await ready(page,{level:3});await shot(page,4,135*Math.cos(.24),135*Math.sin(.24));
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().burning),{timeout:6000}).toBeGreaterThan(0);
 await page.locator('#stage').screenshot({path:'evidence/fire-burning.png'});
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().sound.played.fire_launch||0)).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().removed)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>MCBlockLaunch.getStatus().backgroundRemoved)).toBe(0);
 const d=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(d.removed).toBeGreaterThan(0);expect(d.explosions).toBe(0);expect(d.sound.failed).toBe(0);
 require('node:fs').writeFileSync('evidence/fire-browser.json',JSON.stringify(d,null,2));
});

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
test('十关完整起步，攻击前后画面、重开库存与刚体数量可核验',async({page})=>{
 test.setTimeout(150000);await ready(page);const errors=[],failed=[],reports=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 for(let i=0;i<10;i++){
  if(i)await chooseLevel(page,i);const before=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(before.enemiesAlive).toBeGreaterThan(0);expect(before.terrainPixels%64).toBe(0); // Full blocks and genuine 8x8 stair quadrants.
  await page.locator('#stage').screenshot({path:`evidence/level-${i+1}-initial.png`});await shot(page,i?2:1);
  if(i)await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().explosions),{timeout:7000}).toBe(1);else await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().removed),{timeout:7000}).toBeGreaterThan(0);
  await page.waitForTimeout(500);await page.locator('#stage').screenshot({path:`evidence/level-${i+1}-after.png`});reports.push(await page.evaluate(()=>MCBlockLaunch.getDiagnostics()));await restart(page);
  const reset=await page.evaluate(()=>MCBlockLaunch.getStatus());expect(reset.bodies).toBe(before.bodies);expect(reset.inventory).toEqual(before.inventory);
 }expect(errors).toEqual([]);expect(failed).toEqual([]);require('node:fs').writeFileSync('evidence/levels.json',JSON.stringify(reports,null,2));
});
