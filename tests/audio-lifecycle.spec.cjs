const {test,expect}=require('@playwright/test');

test('real fuse audio freezes while paused, resumes from its position, and releases on stop',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#startScreen').click();
 await page.evaluate(async()=>{
  const {Assets}=await import('/src/assets.mjs');const assets=new Assets();assets.setSoundEnabled(true);assets.setSoundVolume(1);
  assets.sounds.fuse=new Audio('/assets/sfx/fuse.ogg');assets.play('fuse',.35);
  window.__audioLifecycle={assets,clip:[...assets.activeSounds.keys()][0]};
 });
 await expect.poll(()=>page.evaluate(()=>__audioLifecycle.clip.currentTime)).toBeGreaterThan(.15);
 const stoppedAt=await page.evaluate(()=>{__audioLifecycle.assets.pauseAll();return __audioLifecycle.clip.currentTime;});
 await page.waitForTimeout(250);
 expect(await page.evaluate(()=>__audioLifecycle.clip.paused)).toBe(true);
 expect(await page.evaluate(()=>__audioLifecycle.clip.currentTime)).toBeCloseTo(stoppedAt,2);
 await page.evaluate(()=>__audioLifecycle.assets.resumeAll());
 await expect.poll(()=>page.evaluate(()=>__audioLifecycle.clip.currentTime)).toBeGreaterThan(stoppedAt+.15);
 expect(await page.evaluate(()=>__audioLifecycle.assets.audioStats.played.fuse)).toBe(1);
 await page.evaluate(()=>__audioLifecycle.assets.stopAll());
 expect(await page.evaluate(()=>({paused:__audioLifecycle.clip.paused,playing:__audioLifecycle.assets.playing,active:__audioLifecycle.assets.activeSounds.size,failed:__audioLifecycle.assets.audioStats.failed}))).toEqual({paused:true,playing:0,active:0,failed:0});
});
