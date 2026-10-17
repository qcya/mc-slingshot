const { test, expect } = require('@playwright/test');
async function ready(page){
  await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().ready)).toBe(true);
}
async function dragShot(page,kind=1,dx=128,dy=34){
  await page.keyboard.press(String(kind));
  const b=await page.locator('#stage').boundingBox();
  const p=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher);
  const x=b.x+p.x*b.width/1536,y=b.y+p.y*b.height/864;
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(x-dx*b.width/1536,y+dy*b.height/864,{steps:16});
  await page.mouse.up();
}
test('实际拖拽带动投石臂，弹药从臂端脱离并进入完整 Matter 世界',async({page})=>{
  await ready(page);
  const before=await page.evaluate(()=>MCBlockLaunch.getStatus());
  await dragShot(page);
  await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().shots)).toBe(before.shots-1);
  await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().ammoBodies.length)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().physics)).toBe('Matter.js');
  await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().removed),{timeout:7000}).toBeGreaterThan(0);
  await page.getByRole('button',{name:'↻ 重开',exact:true}).click();
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().shots)).toBe(before.shots);
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().removed)).toBe(0);
});
module.exports={ready,dragShot};

test('四种弹药通过真实拖拽产生撞击、延迟爆炸、穿墙和引力',async({page})=>{
  await ready(page);
  const reports=[];
  for(const [kind,id] of [[1,'cobble'],[2,'tnt'],[3,'ender'],[4,'blackhole']]){
    await page.getByRole('button',{name:'↻ 重开',exact:true}).click();
    await dragShot(page,kind);
    await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(1);
    if(id==='ender')await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().portals),{timeout:6000}).toBeGreaterThan(0);
    else await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().removed),{timeout:7000}).toBeGreaterThan(0);
    if(id==='tnt')expect(await page.evaluate(()=>MCBlockLaunch.getStatus().explosions)).toBe(1);
    if(id==='blackhole'){
      expect(await page.evaluate(()=>MCBlockLaunch.getStatus().blackholes)).toBe(1);
      await page.waitForTimeout(1300);
      expect(await page.evaluate(()=>MCBlockLaunch.getStatus().stepMs)).toBeLessThan(20);
      expect(await page.evaluate(()=>MCBlockLaunch.getStatus().particles)).toBeLessThanOrEqual(850);
    }
    await page.locator('#stage').screenshot({path:`evidence/ammo-${id}.png`});
    if(id==='cobble'){
      await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().restingBlocks),{timeout:14000}).toBeGreaterThan(0);
    }
    reports.push({kind:id,...await page.evaluate(()=>MCBlockLaunch.getDiagnostics())});
  }
  require('node:fs').writeFileSync('evidence/weapons.json',JSON.stringify(reports,null,2));
});

test('五关初始与 TNT 后画面、重开及暂停均可核验',async({page})=>{
  await ready(page);const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  const reports=[];
  for(let i=0;i<5;i++){
    await page.getByLabel('选择关卡',{exact:true}).selectOption(String(i));
    const before=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());
    expect(before.enemiesAlive).toBe([2,3,4,4,5][i]);expect(before.removed).toBe(0);expect(before.terrainPixels%256).toBe(0);
    await page.locator('#stage').screenshot({path:`evidence/level-${i+1}-initial.png`});
    await dragShot(page,2);
    await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().explosions),{timeout:7000}).toBe(1);
    await page.waitForTimeout(1500);
    await page.locator('#stage').screenshot({path:`evidence/level-${i+1}-tnt.png`});
    reports.push({level:i+1,...await page.evaluate(()=>MCBlockLaunch.getDiagnostics())});
    await page.getByRole('button',{name:'↻ 重开',exact:true}).click();
    const reset=await page.evaluate(()=>MCBlockLaunch.getStatus());expect(reset.bodies).toBe(before.bodies);
  }
  await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).click();
  const time=await page.evaluate(()=>MCBlockLaunch.getStatus().time);await page.waitForTimeout(200);
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().time)).toBe(time);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
  require('node:fs').writeFileSync('evidence/levels.json',JSON.stringify(reports,null,2));
});
