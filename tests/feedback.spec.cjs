const {test,expect}=require('@playwright/test');
test('滚轮循环切换九格，首尾物品框对齐且空格不发射',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);
 await page.locator('#stage').hover();await page.mouse.wheel(0,-120);
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().selectedSlot)).toBe(8);
 await page.screenshot({path:'evidence/hotbar-last-slot.png'});
 const rects=await page.locator('#ballbar').evaluate(bar=>{
  const b=bar.getBoundingClientRect();return [...bar.children].map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,left:r.left-b.left,right:r.right-b.left,limit:b.width};});
 });
 expect(Math.abs(rects[0].w-rects[0].h)).toBeLessThan(.2);expect(rects[0].left).toBeGreaterThan(0);expect(rects[8].right).toBeLessThan(rects[8].limit);
 const shots=await page.evaluate(()=>MCBlockLaunch.getStatus().shots);
 await page.keyboard.press('9');expect(await page.evaluate(()=>MCBlockLaunch.getStatus().selected)).toBe('empty');
 expect(await page.evaluate(()=>MCBlockLaunch.getStatus().shots)).toBe(shots);
 await page.keyboard.press('1');await page.screenshot({path:'evidence/hotbar-first-slot.png'});
});
test('左下蓄力不反向，九格物品栏、立体行走人物与静态云实际显示',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);
 const initial=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());
 expect(await page.locator('#ballbar button').count()).toBe(9);expect(await page.locator('.metrics,.foot,.brand').count()).toBe(0);
 const b=await page.locator('#stage').boundingBox(),p=initial.launcher;
 await page.mouse.move(b.x+p.x*b.width/1536,b.y+p.y*b.height/864);await page.mouse.down();
 await page.mouse.move(b.x+110*b.width/1536,b.y+660*b.height/864,{steps:12});
 const aimed=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher);
 expect(aimed.x).toBeLessThan(p.x);expect(aimed.y).toBeGreaterThan(p.y);
 await page.screenshot({path:'evidence/left-below-aim.png'});await page.mouse.up();
 await page.waitForTimeout(600);await page.getByRole('button',{name:'↻ 重开',exact:true}).click();
 const cloud=()=>page.evaluate(()=>Array.from(document.querySelector('#stage').getContext('2d').getImageData(400,30,400,90).data));
 const sky=await cloud();await page.waitForTimeout(1700);
 expect(await cloud()).toEqual(sky);
 const moved=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(moved.enemies.every(e=>e.walkDistance>2)).toBe(true);
 await page.screenshot({path:'evidence/gameplay-overview.png'});
 const fs=require('node:fs');fs.writeFileSync('evidence/feedback.json',JSON.stringify({initial,moved,aimed},null,2));
 // Render the exact production cuboid skin renderer at inspection scale.
 await page.evaluate(async()=>{
  const {MobSprites}=await import('/src/mobs.mjs'),{Assets}=await import('/src/assets.mjs');const a=await new Assets().load(),sprites=new MobSprites(a);
  const c=document.createElement('canvas');c.id='mobInspection';c.width=720;c.height=300;const x=c.getContext('2d');x.fillStyle='#80b6eb';x.fillRect(0,0,720,300);x.imageSmoothingEnabled=false;
  for(const [i,skin] of ['zombie','pillager'].entries())for(const [j,dir] of [-1,1].entries()){
   const im=sprites.frame(skin,.9,dir);x.drawImage(im,25+(i*2+j)*175,28,162,180);x.fillStyle='#fff';x.font='18px sans-serif';x.fillText(`${skin} ${dir===1?'→':'←'}`,25+(i*2+j)*175,245);
  }c.style='position:fixed;inset:0;z-index:50;width:720px;height:300px';document.body.append(c);
 });
 await page.locator('#mobInspection').screenshot({path:'evidence/mob-models.png'});
});
