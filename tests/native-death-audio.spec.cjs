const {test,expect}=require('@playwright/test'),{ready,shotPlan}=require('./browser-helpers.cjs');
test('a real first-level kill plays the original pillager death clip',async({page})=>{
 await ready(page);await shotPlan(page,require('../evidence/playability-search.json')[0].history[0]);
 await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().sound.played.pillager_death||0),{timeout:10000}).toBeGreaterThan(0);
 const data=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(data.sound.failed).toBe(0);expect(data.enemiesAlive).toBe(0);
});
