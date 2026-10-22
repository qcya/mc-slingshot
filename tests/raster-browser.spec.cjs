const {test,expect}=require('@playwright/test');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');
let oldRenderer='';
try{oldRenderer=execFileSync('git',['show','199d3e3:src/renderer.mjs'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'});}catch{}
async function prepare(page){
 await page.route('**/raster-audit.html',r=>r.fulfill({contentType:'text/html',body:'<canvas width="1536" height="864"></canvas><script src="/vendor/matter.min.js"></script>'}));
 if(oldRenderer)await page.route('**/src/__audit-old-renderer.mjs',r=>r.fulfill({contentType:'text/javascript',body:oldRenderer}));
 await page.goto('/raster-audit.html');await page.waitForFunction(()=>window.Matter);
}
test('incremental canvas rasters match a complete RGBA reference across four dimensions and level resets',async({page})=>{
 await prepare(page);
 const report=await page.evaluate(async()=>{
  const [{Assets},{Renderer},{SiegeWorld},{buildLevel},{foregroundPixel,rearPixel}]=await Promise.all([import('/src/assets.mjs'),import('/src/renderer.mjs'),import('/src/world.mjs'),import('/src/levels.mjs'),import('/src/scenery.mjs')]);
  const assets=await new Assets().load(),renderer=new Renderer(document.querySelector('canvas'),assets),checks=[];
  const reference=document.createElement('canvas');reference.width=512;reference.height=288;const rc=reference.getContext('2d',{willReadFrequently:true});
  function compare(world,scene,label){
   renderer.drawRear(world);renderer.cacheGrid(world.grid);
   for(const [layer,g,canvas,color]of [['foreground',world.grid,renderer.terrain,(m,x,y)=>foregroundPixel(assets,m,x,y,world.grid,scene.visual)],['rear',world.rear.grid,renderer.rearCanvas,(m,x,y)=>rearPixel(assets,m,x,y,world,scene.visual)]]){
    const image=rc.createImageData(g.width,g.height);
    for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){const m=g.get(x,y);if(m)image.data.set(color(m,x,y),(y*g.width+x)*4);}
    rc.putImageData(image,0,0);
    const expected=rc.getImageData(0,0,512,288).data,actual=canvas.getContext('2d').getImageData(0,0,512,288).data;
    let mismatch=null;for(let k=0;k<actual.length;k++)if(actual[k]!==expected[k]){mismatch={x:Math.floor(k/4)%512,y:Math.floor(k/2048),channel:k%4,expected:expected[k],actual:actual[k]};break;}
    checks.push({dimension:scene.dimension,label,layer,mismatch});
   }
  }
  for(const dimension of ['overworld','nether','end','sift']){
   const scene=buildLevel(7,dimension),world=new SiegeWorld(Matter,scene);renderer.reset(scene);compare(world,scene,'initial');
   const candidates=[];for(let y=1;y<224&&candidates.length<4;y++)for(let x=272;x<511&&candidates.length<4;x++){const m=world.grid.get(x,y);if(m&&m!==7&&m!==40)candidates.push({x,y});}
   for(const p of candidates.slice(0,3)){world.grid.set(p.x,p.y,0);world.rear.grid.set(p.x,p.y,0);}compare(world,scene,'removed pixels and neighbour shading');
   const p=candidates[3];world.grid.set(p.x,p.y,world.grid.get(p.x,p.y)===16?3:16);compare(world,scene,'material recolour');
   let edited=false;for(let y=0;y<288&&!edited;y++)for(let x=272;x<512&&!edited;x++)if(world.rear.grid.get(x,y)){world.rear.grid.set(x,y,0);edited=true;}compare(world,scene,'rear-only removal');
   const next=buildLevel(9,dimension),second=new SiegeWorld(Matter,next);renderer.reset(next);compare(second,next,'level reset');
   for(const w of [world,second]){Matter.Events.off(w.engine);Matter.Composite.clear(w.engine.world,false);Matter.Engine.clear(w.engine);}
  }
  return checks;
 });
 expect(report).toHaveLength(40);expect(report.filter(r=>r.mismatch)).toEqual([]);
 await fs.mkdir('.superpowers/beta5-perf',{recursive:true});await fs.writeFile('.superpowers/beta5-perf/raster-rgba.json',JSON.stringify(report,null,2));
});
test('real anvil carving reuses raster buffers and reduces work versus the previous renderer',async({page})=>{
 test.skip(!oldRenderer,'The optional performance baseline requires repository commit 199d3e3.');
 await prepare(page);
 const report=await page.evaluate(async()=>{
  const [{Assets},{Renderer},{Renderer:OldRenderer},{SiegeWorld},{buildLevel},{PROJECTILES}]=await Promise.all([import('/src/assets.mjs'),import('/src/renderer.mjs'),import('/src/__audit-old-renderer.mjs'),import('/src/world.mjs'),import('/src/levels.mjs'),import('/src/config.mjs')]);
  const assets=await new Assets().load(),make=Type=>{const c=document.createElement('canvas');c.width=1536;c.height=864;return new Type(c,assets);},current=make(Renderer),old=make(OldRenderer);
  let metric=null,pixelCalls=0;const originalPixel=assets.pixel.bind(assets);assets.pixel=(m,x,y)=>{pixelCalls++;return originalPixel(m,x,y);};
  for(const Type of [Renderer,OldRenderer])for(const method of ['cacheGrid','drawRear']){const original=Type.prototype[method];Type.prototype[method]=function(...args){const start=performance.now(),before=pixelCalls,result=original.apply(this,args);if(metric){metric[`${method}Ms`]+=performance.now()-start;metric[`${method}Pixels`]+=pixelCalls-before;}return result;};}
  const originalCreate=CanvasRenderingContext2D.prototype.createImageData;CanvasRenderingContext2D.prototype.createImageData=function(...args){if(metric){metric.imageCalls++;metric.imageBytes+=args[0]*args[1]*4;}return originalCreate.apply(this,args);};
  const state={pouch:{x:285,y:545},ammo:PROJECTILES.find(a=>a.id==='anvil'),loaded:true,drag:false,vx:0,vy:0},median=a=>a.length?a.sort((a,b)=>a-b)[Math.floor(a.length/2)]:0,rows=[];
  for(const count of [0,1,2])for(let run=0;run<5;run++){
   const scene=buildLevel(7),world=new SiegeWorld(Matter,scene);for(const a of scene.enemies)world.addEnemy(a.x,a.feet,a.skin,a);
   for(const r of [old,current]){r.reset(scene);r.draw(world,state);}
   // Let real Matter contact initiate the bounded floor impact; no injected drill state.
   for(let n=0;n<count;n++)world.spawnProjectile('anvil',540+n*90,620,0,180);
   for(let frame=0;frame<30;frame++){
    world.step(1/120);world.step(1/120);world.events.length=0;
    const dirty=current.version!==world.grid.version;
    for(const [name,r]of frame%2?[['current',current],['old',old]]:[['old',old],['current',current]]){
     metric={count,renderer:name,dirty,cacheGridMs:0,drawRearMs:0,cacheGridPixels:0,drawRearPixels:0,imageCalls:0,imageBytes:0};
     const start=performance.now();r.draw(world,state);metric.drawMs=performance.now()-start;if(run&&frame>2)rows.push(metric);metric=null;
    }
   }
   Matter.Events.off(world.engine);Matter.Composite.clear(world.engine.world,false);Matter.Engine.clear(world.engine);
  }
  const results=[];
  for(const count of [0,1,2])for(const name of ['old','current']){const all=rows.filter(r=>r.count===count&&r.renderer===name),dirty=all.filter(r=>r.dirty),sample=dirty.length?dirty:all,out={anvils:count,renderer:name,frames:all.length,dirtyFrames:dirty.length};for(const key of ['drawMs','cacheGridMs','drawRearMs','cacheGridPixels','drawRearPixels','imageCalls','imageBytes'])out[key]=median(sample.map(r=>r[key]));results.push(out);}
  return {baseline:'199d3e3',note:'Headless Edge, real assets and Canvas; same live anvil world; medians over warmed dirty frames, with pixel counters; no timing threshold',results};
 });
 for(const count of [1,2]){const before=report.results.find(r=>r.anvils===count&&r.renderer==='old'),after=report.results.find(r=>r.anvils===count&&r.renderer==='current');expect(before.dirtyFrames).toBeGreaterThan(0);expect(before.imageCalls).toBe(2);expect(after.imageCalls).toBe(0);expect(after.cacheGridPixels+after.drawRearPixels).toBeLessThan(before.cacheGridPixels+before.drawRearPixels);}
 await fs.mkdir('.superpowers/beta5-perf',{recursive:true});await fs.writeFile('.superpowers/beta5-perf/raster-browser.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
});
