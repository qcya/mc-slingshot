const {test,expect}=require('@playwright/test');
const {ready,aim}=require('./browser-helpers.cjs');

test('a tap without pulling keeps the loaded stone, while a tiny intentional pull still launches',async({page})=>{
 await ready(page);
 const before=await page.evaluate(()=>MCBlockLaunch.getStatus());
 const box=await page.locator('#stage').boundingBox();
 await page.mouse.click(box.x+before.launcher.x*box.width/1536,box.y+before.launcher.y*box.height/864);
 const tapped=await page.evaluate(()=>MCBlockLaunch.getStatus());
 expect(tapped.inventory).toEqual(before.inventory);
 expect(tapped.launched).toBe(0);
 expect(tapped.launcher.phase).toBe('ready');
 await aim(page,-2,0);await page.mouse.up();
 const pulled=await page.evaluate(()=>MCBlockLaunch.getStatus());
 expect(pulled.launched).toBe(1);
 expect(pulled.inventory[0]).toBe(before.inventory[0]-1);
});
