const {test,expect}=require('@playwright/test');
const {ready,shot}=require('./browser-helpers.cjs');

test('pausing freezes real effect playback, resuming continues it, and restart clears old sounds',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('mc-block-launch.music.v1','off');
  window.reviewClips=[];const original=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){if(this.src.startsWith('blob:')&&!window.reviewClips.includes(this))window.reviewClips.push(this);return original.apply(this,arguments);};
 });
 await ready(page,{level:1});await shot(page,2,90,40);
 await expect.poll(()=>page.evaluate(()=>reviewClips.some(a=>!a.paused&&a.currentTime>0&&!a.ended))).toBe(true);
 await page.keyboard.press('Escape');
 const state=await page.evaluate(()=>({time:MCBlockLaunch.getStatus().time,clips:reviewClips.map(a=>({paused:a.paused,time:a.currentTime}))}));
 expect(state.clips.every(a=>a.paused)).toBe(true);
 await page.waitForTimeout(200);
 const later=await page.evaluate(()=>({time:MCBlockLaunch.getStatus().time,clips:reviewClips.map(a=>a.currentTime)}));
 expect(later.time).toBe(state.time);
 for(let i=0;i<later.clips.length;i++)expect(Math.abs(later.clips[i]-state.clips[i].time)).toBeLessThan(.03);
 await page.locator('#resume').click();
 await expect.poll(()=>page.evaluate(()=>reviewClips.some(a=>!a.paused&&!a.ended))).toBe(true);
 await page.keyboard.press('r');
 expect(await page.evaluate(()=>reviewClips.every(a=>a.paused))).toBe(true);
});
