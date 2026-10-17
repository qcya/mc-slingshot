const {test,expect}=require('@playwright/test');const {ready,aim}=require('./browser-helpers.cjs');
test('mouse coordinates map to the same sling launch parameters as the preview',async({page})=>{
 await ready(page,{level:1});const p=require('../evidence/playability-search.json')[1].history[0];
 await aim(page,-135*p.pull*Math.cos(p.angle),135*p.pull*Math.sin(p.angle));
 const launcher=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher);
 expect(Math.abs(launcher.x-p.origin.x)).toBeLessThan(.001);expect(Math.abs(launcher.y-p.origin.y)).toBeLessThan(.001);
 expect(Math.abs(launcher.vx-p.vx)).toBeLessThan(.01);expect(Math.abs(launcher.vy-p.vy)).toBeLessThan(.01);
});
