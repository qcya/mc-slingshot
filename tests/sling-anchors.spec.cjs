const {test,expect}=require('@playwright/test');const {ready,aim}=require('./browser-helpers.cjs');
test('front and reverse pulls keep the bands attached to both binding centers',async({page})=>{
 await ready(page,{level:2});await page.keyboard.press('2');const box=await page.locator('#stage').boundingBox(),s=box.width/1536;
 for(const [name,dx,dy] of [['front',-95,30],['reverse',65,-85]]){
  await aim(page,dx,dy);await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().preview.length)).toBe(5);
  await page.screenshot({path:`evidence/sling-fixed-${name}.png`,clip:{x:box.x+140*s,y:box.y+410*s,width:300*s,height:280*s}});
  await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.mouse.up();
 }expect(await page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(0);
});
