const {test,expect}=require('@playwright/test');
const {ready,aim}=require('./browser-helpers.cjs');
for(const [name,size,touch]of [['desktop',{width:1280,height:800},false],['phone',{width:844,height:390},true]])test(`nine-slot HUD stays outside underground combat on ${name}`,async({browser})=>{
 const context=await browser.newContext({viewport:size,hasTouch:touch,isMobile:touch});const page=await context.newPage();
 try{
  await ready(page,{level:9});
  const canvas=await page.locator('#stage').boundingBox(),bar=await page.locator('#ballbar').boundingBox();
  expect(bar.y).toBeGreaterThanOrEqual(canvas.y+canvas.height);
  expect(Math.abs(canvas.width/canvas.height-16/9)).toBeLessThan(.01);
  expect(bar.x).toBeGreaterThanOrEqual(0);expect(bar.x+bar.width).toBeLessThanOrEqual(size.width+1);
  await aim(page,-100,25);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().launcher.phase)).toBe('aim');await page.mouse.up();
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(1);
 }finally{await context.close();}
});
