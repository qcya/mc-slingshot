const {test,expect}=require('@playwright/test');

test('roof damage updates the visible rear hole for stone, fire and TNT',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/layer-check.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>body{margin:0}</style><canvas id="check" width="1536" height="864"></canvas><script src="/vendor/matter.min.js"></script>'}));
 await page.goto('/layer-check.html');
 await page.evaluate(async()=>{
  const [{Assets},{Renderer},{buildLevel},{SiegeWorld}]=await Promise.all(['assets','renderer','levels','world'].map(n=>import(`/src/${n}.mjs`)));
  const assets=await new Assets().load();
  const renderer=new Renderer(document.querySelector('#check'),assets);
  window.resetLayerCheck=()=>{
   const scene=buildLevel(3),world=new SiegeWorld(Matter,scene);
   const launcher={pouch:{x:285,y:545},loaded:false};
   renderer.reset(scene);
   let target;
   for(let x=320;x<464&&!target;x++)for(let y=0;y<160;y++)if(world.grid.get(x,y)&&world.rear.grid.get(x,y)){target={x:(x+.5)*3,y:(y+.5)*3};break;}
   if(!target)throw Error('missing overlapped roof fixture');
   window.layerCheck={world,renderer,scene,launcher,target,front:world.grid.cells.slice(),rear:world.rear.grid.cells.slice()};
   renderer.draw(world,launcher);
  };
  resetLayerCheck();
 });
 const clip={x:930,y:0,width:606,height:700};
 await page.screenshot({path:'evidence/linked-background-roof-before.png',clip});
 for(const kind of ['stone','fire','tnt']){
  const result=await page.evaluate(kind=>{
   resetLayerCheck();
   const c=layerCheck,w=c.world,{x,y}=c.target;
   if(kind==='stone')w.damageDisk(x,y,31,140);
   if(kind==='fire'){if(!w.ignite(x,y))throw Error('roof did not ignite');for(let i=0;i<480;i++)w.step(1/120);}
   if(kind==='tnt')w.blast(x+90,y+30);
   c.renderer.draw(w,c.launcher);
   let erased=0,mismatches=0;
   for(let k=0;k<c.front.length;k++)if(c.front[k]&&!w.grid.cells[k]){
    erased++;if(c.rear[k]&&w.rear.grid.cells[k])mismatches++;
   }
   return {erased,mismatches,backgroundRemoved:w.stats.backgroundRemoved,version:w.rear.grid.version,drawnVersion:c.renderer.rearVersion,debris:w.debris.length};
  },kind);
  expect(result.erased).toBeGreaterThan(0);expect(result.backgroundRemoved).toBeGreaterThan(0);
  expect(result.mismatches).toBe(0);expect(result.drawnVersion).toBe(result.version);expect(result.debris).toBe(0);
  await page.screenshot({path:`evidence/linked-background-roof-${kind}.png`,clip});
 }
 expect(errors).toEqual([]);
});
