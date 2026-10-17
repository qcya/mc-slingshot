const {test,expect}=require('@playwright/test');
async function ready(page){await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);}
async function aim(page,dx,dy){const b=await page.locator('#stage').boundingBox(),p=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher),x=b.x+p.x*b.width/1536,y=b.y+p.y*b.height/864;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*b.width/1536,y+dy*b.height/864,{steps:12});return {x,y};}
test('向后蓄力有真实拉伸声音，右键取消且不扣弹',async({page})=>{
 await ready(page);const before=await page.evaluate(()=>MCBlockLaunch.getStatus().shots);await aim(page,80,25);
 expect(await page.evaluate(()=>MCBlockLaunch.getStatus().launcher.vx)).toBeLessThan(0);
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().drawSound.signalRms)).toBeGreaterThan(.00001);
 expect(await page.evaluate(()=>MCBlockLaunch.getDiagnostics().drawSound.state)).toBe('running');
 await page.screenshot({path:'evidence/backward-aim.png'});
 await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.mouse.up();
 expect(await page.evaluate(()=>MCBlockLaunch.getStatus().shots)).toBe(before);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(0);
 expect(await page.evaluate(()=>MCBlockLaunch.getDiagnostics().drawSound.active)).toBe(false);
});
test('小力度和反向发射都能真正产生弹药刚体',async({page})=>{
 await ready(page);await aim(page,-2,0);await page.mouse.up();await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(1);
 await page.getByRole('button',{name:'↻ 重开',exact:true}).click();await aim(page,60,10);const x=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher.x);await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(1);
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().ammoBodies[0]?.x??9999)).toBeLessThan(x-5);
});
test('两次真实落下的 TNT 会相互炸飞，后一颗保留自己的引信',async({page})=>{
 await ready(page);await page.keyboard.press('2');await aim(page,0,0);await page.mouse.up();await page.waitForTimeout(1050);
 await aim(page,0,0);await page.mouse.up();await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(2);
 await page.waitForFunction(()=>MCBlockLaunch.getStatus().explosions===1,null,{timeout:6000});
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getStatus().ammoBodies[0]?.speed||0)).toBeGreaterThan(200);
 await page.screenshot({path:'evidence/tnt-interaction.png'});
 const d=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(d.debris).toBe(0);expect(d.ammoBodies.some(p=>p.id==='tnt')).toBe(true);
 require('node:fs').writeFileSync('evidence/tnt-interaction.json',JSON.stringify(d,null,2));
});
test('用户透明 PNG 弹弓、右侧樱花背景与怪物停顿抬手实际显示',async({page})=>{
 await ready(page);await page.locator('#stage').click({position:{x:500,y:100}});
 const alpha=await page.evaluate(async()=>{const im=new Image();im.src='/assets/sprites/slingshot-frame.png';await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);return [[0,0],[im.width-1,0],[0,im.height-1],[im.width-1,im.height-1]].map(([a,b])=>x.getImageData(a,b,1,1).data[3]);});expect(alpha).toEqual([0,0,0,0]);
 await page.screenshot({path:'evidence/ai-sling-overview.png'});
 await page.waitForFunction(()=>MCBlockLaunch.getDiagnostics().enemies.some(e=>e.behavior==='idle'&&e.pose.gesture>.3),null,{timeout:12000});
 await page.screenshot({path:'evidence/idle-gesture.png'});
 const d=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());require('node:fs').writeFileSync('evidence/idle-gesture.json',JSON.stringify(d,null,2));
 expect(d.sound.failed).toBe(0);
});
