const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const proof='evidence/review-0.13.2';
async function boot(page){
 await page.addInitScript(()=>localStorage.setItem('mc-block-launch.profile.v1',JSON.stringify({nickname:'Guide test',id:'guide',token:'guide-only'})));
 await page.route('**/api/**',route=>route.fulfill({json:route.request().url().includes('/health')?{ok:true,scoreSeason:'three-dimensions-v2'}:{profile:{nickname:'Guide test'},stages:[],entries:[]}}));
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await fs.mkdir(proof,{recursive:true});
}

for(const [name,size] of [['desktop',{width:1280,height:800}],['phone-landscape',{width:844,height:390}],['phone-portrait',{width:390,height:844}]])test(`guide is readable, scrollable and returns correctly on ${name}`,async({page})=>{
 await page.setViewportSize(size);await boot(page);await page.locator('#guideBtn').focus();await page.keyboard.press('Enter');
 await expect(page.locator('#guideMenu')).toBeVisible();await expect(page.locator('#itemGuide article')).toHaveCount(9);
 await expect(page.locator('[data-item="snowball"]')).toContainText('完全停止移动和动作');
 await expect(page.locator('#guideContent')).toContainText('下界十关全通 → 解锁末地');
 const initial=await page.locator('#guideContent').evaluate(el=>({scroll:el.scrollTop,height:el.clientHeight,total:el.scrollHeight,overflow:el.scrollWidth>el.clientWidth}));
 expect(initial.total).toBeGreaterThan(initial.height);expect(initial.overflow).toBe(false);
 await page.locator('[data-item="snowball"]').scrollIntoViewIfNeeded();await expect(page.locator('#guideBack')).toBeInViewport();
 await page.screenshot({path:`${proof}/guide-${name}.png`});await page.keyboard.press('Escape');await expect(page.locator('#startScreen')).toBeVisible();
 await page.locator('#startScreen').click();await page.locator('#level-0').click();await page.keyboard.press('Escape');await page.locator('#settingsBtn').click();
 const before=await page.evaluate(()=>MCBlockLaunch.getStatus().time);await page.locator('#settingsGuide').click();await page.waitForTimeout(250);
 expect(await page.evaluate(()=>MCBlockLaunch.getStatus().time)).toBe(before);await page.locator('#guideBack').click();await expect(page.locator('#settingsMenu')).toBeVisible();
 await page.locator('#settingsBack').click();await expect(page.locator('#pauseMenu button')).toHaveCount(5);await page.locator('#resume').click();
 expect(await page.evaluate(()=>MCBlockLaunch.getStatus().screen)).toBe('play');
});

test('real projectile ice rendering and Hoglin gait sheet',async({page})=>{
 await boot(page);
 const report=await page.evaluate(async()=>{
  const [{Assets},{SiegeWorld},{PixelGrid},{Renderer},{MobSprites}]=await Promise.all([import('/src/assets.mjs'),import('/src/world.mjs'),import('/src/pixels.mjs'),import('/src/renderer.mjs'),import('/src/mobs.mjs')]);
  const assets=await new Assets().load(),canvas=document.createElement('canvas');canvas.id='ice-review';canvas.width=1536;canvas.height=650;canvas.style='position:fixed;inset:0;width:100vw;height:auto;z-index:100';document.body.append(canvas);
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const renderer=new Renderer(canvas,assets),reports=[];
  c.fillStyle='#363e4b';c.fillRect(0,0,canvas.width,canvas.height);c.font='22px sans-serif';
  for(const [i,skin] of ['hoglin','warden','pillager','shulker'].entries()){
   const grid=new PixelGrid(512,288);grid.fill(0,160,512,128,7);const w=new SiegeWorld(Matter,{grid}),e=w.addEnemy(220+i*360,480,skin,{stationary:true});
   if(skin==='shulker')for(let n=0;n<1000&&e.shellAmount<.8;n++)w.step(1/120);
   const p=w.spawnProjectile('snowball',e.body.position.x-100,e.body.position.y-12,600,0);
   for(let n=0;n<75&&!e.frozen;n++)w.step(1/120);
   reports.push({skin,frozen:e.frozen,consumed:!!p.dead,pose:{...e.pose}});renderer.mob(e,w);
   c.fillStyle='white';c.fillText(skin,e.body.position.x-65,540);
  }
  const sheet=document.createElement('canvas');sheet.id='hoglin-review';sheet.width=1200;sheet.height=480;sheet.style.cssText=canvas.style.cssText;sheet.style.display='none';document.body.append(sheet);
  const ctx=sheet.getContext('2d'),sprites=new MobSprites(assets);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#47414a';ctx.fillRect(0,0,1200,480);ctx.font='20px sans-serif';ctx.fillStyle='white';
  for(const [row,direction] of [-1,1].entries())for(let col=0;col<4;col++){
   ctx.save();ctx.translate(150+col*300,180+row*240);ctx.scale(4,4);sprites.paint(ctx,'hoglin',col*Math.PI/2,direction);ctx.restore();ctx.fillText(`facing ${direction}, phase ${col}/4`,25+col*300,220+row*240);
  }
  return reports;
 });
 for(const row of report){expect(row.frozen,row.skin).toBe(true);expect(row.consumed,row.skin).toBe(true);}
 await page.locator('#ice-review').screenshot({path:`${proof}/ice-shells.png`});
 await page.locator('#ice-review').evaluate(el=>el.style.display='none');await page.locator('#hoglin-review').evaluate(el=>el.style.display='block');
 await page.locator('#hoglin-review').screenshot({path:`${proof}/hoglin-gait.png`});await fs.writeFile(`${proof}/ice-projectiles.json`,JSON.stringify(report,null,2));
});
