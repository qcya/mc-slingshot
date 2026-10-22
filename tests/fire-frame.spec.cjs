const {test,expect}=require('@playwright/test');
const fs=require('node:fs');

for(const [name,viewport]of [['desktop',{width:1536,height:864}],['mobile',{width:750,height:422}]])test(`lava-lit stone has no atlas seam above its flames on ${name}`,async({page})=>{
  await page.setViewportSize(viewport);
  await page.route('**/fire-review.html',r=>r.fulfill({contentType:'text/html',body:'<style>body{margin:0}canvas{display:block;width:100vw;height:auto;image-rendering:pixelated}</style><canvas width="1536" height="864"></canvas><script src="/vendor/matter.min.js"></script>'}));
  await page.goto('/fire-review.html');
  const report=await page.evaluate(async()=>{
    const [{Assets},{Renderer},{SiegeWorld},{PixelGrid},{AMMO}]=await Promise.all([import('/src/assets.mjs'),import('/src/renderer.mjs'),import('/src/world.mjs'),import('/src/pixels.mjs'),import('/src/config.mjs')]);
    const assets=await new Assets().load(),canvas=document.querySelector('canvas'),renderer=new Renderer(canvas,assets),world=new SiegeWorld(Matter,{grid:new PixelGrid(512,288),lavaSources:[{x:12,y:10}]});
    world.engine.gravity.y=0;const stone=world.spawnProjectile('cobble',600,500,0,0);world.step(1/120);
    const litByLava=stone.ignited===true,atlas=assets.images.fire_0,source=document.createElement('canvas');source.width=atlas.width;source.height=atlas.height;const sc=source.getContext('2d');sc.drawImage(atlas,0,0);
    const sourcePixels=sc.getImageData(0,0,atlas.width,atlas.height).data;
    const topRowsTransparent=Array.from({length:32},(_,frame)=>Array.from({length:16},(_,x)=>sourcePixels[(frame*16*16+x)*4+3]===0).every(Boolean)).every(Boolean);
    renderer.reset({dimension:'nether'});const launcher={pouch:{x:285,y:545},ammo:AMMO[0],loaded:false,drag:false},failures=[];let visibleFlameCases=0;
    for(let frame=0;frame<32;frame++)for(const fraction of [.1,.5,.9]){
      Matter.Body.setPosition(stone.body,{x:600.37,y:500+fraction});world.time=(frame-stone.id+32)/12+.00001;
      stone.ignited=false;renderer.draw(world,launcher);const x=580,y=Math.floor(stone.body.position.y-30),baseline=renderer.ctx.getImageData(x,y,41,48).data;
      stone.ignited=true;renderer.draw(world,launcher);const actual=renderer.ctx.getImageData(x,y,41,48).data;
      let changed=0,visible=false;for(let i=0;i<actual.length;i+=4)if(actual[i]!==baseline[i]||actual[i+1]!==baseline[i+1]||actual[i+2]!==baseline[i+2]){if(i<41*4)changed++;else visible=true;}
      if(visible)visibleFlameCases++;
      if(changed)failures.push({frame,fraction,changed});
    }
    Matter.Body.setPosition(stone.body,{x:600.37,y:500.5});world.time=(9-stone.id+32)/12+.00001;stone.ignited=true;renderer.draw(world,launcher);
    return {litByLava,atlas:[atlas.width,atlas.height],topRowsTransparent,cases:32*3,visibleFlameCases,failures};
  });
  const directory='evidence/review-1.0.0/fire';fs.mkdirSync(directory,{recursive:true});
  await page.screenshot({path:`${directory}/${name}-lava-lit-stone.png`});
  await page.evaluate(()=>{const detail=document.createElement('canvas');detail.id='fireDetail';detail.width=80;detail.height=90;detail.getContext('2d').drawImage(document.querySelector('canvas'),560,450,80,90,0,0,80,90);detail.style.cssText='position:absolute;top:0;left:0;width:480px;height:540px;image-rendering:pixelated';document.body.append(detail);});
  await page.locator('#fireDetail').screenshot({path:`${directory}/${name}-fire-detail.png`});
  fs.writeFileSync(`${directory}/${name}-fire-regression.json`,JSON.stringify(report,null,2));
  expect(report.litByLava).toBe(true);expect(report.atlas).toEqual([16,512]);expect(report.topRowsTransparent).toBe(true);expect(report.visibleFlameCases).toBe(report.cases);
  expect(report.failures,'transparent native top rows must not import white pixels from the previous atlas frame').toEqual([]);
});

test('shared flames preserve every native frame at mob, ground and projectile sizes',async({page})=>{
  await page.route('**/fire-native-review.html',r=>r.fulfill({contentType:'text/html',body:'<canvas></canvas>'}));await page.goto('/fire-native-review.html');
  const report=await page.evaluate(async()=>{
    const {drawFireFrame}=await import('/src/fire-frames.mjs'),atlas=new Image();atlas.src='/assets/textures/fire_0.png';await atlas.decode();
    const make=()=>{const c=document.createElement('canvas');c.width=c.height=128;return c.getContext('2d');},actual=make(),expected=make(),failures=[];let cases=0;
    for(let frame=0;frame<32;frame++)for(const [width,height]of [[40,46],[48,60],[60,70]])for(const scale of [.48828125,1,1.3]){
      const native=document.createElement('canvas');native.width=native.height=16;native.getContext('2d').drawImage(atlas,0,frame*16,16,16,0,0,16,16);
      for(const context of [actual,expected]){context.resetTransform();context.clearRect(0,0,128,128);context.imageSmoothingEnabled=false;context.scale(scale,scale);context.globalAlpha=1;}
      drawFireFrame(actual,atlas,frame,20.37,20.5,width,height);expected.drawImage(native,20.37,20.5,width,height);
      const a=actual.getImageData(0,0,128,128).data,e=expected.getImageData(0,0,128,128).data;
      const first=a.findIndex((n,i)=>n!==e[i]);if(first>=0)failures.push({frame,width,height,scale,first,actual:[...a.slice(first-first%4,first-first%4+4)],expected:[...e.slice(first-first%4,first-first%4+4)]});cases++;
    }
    return {cases,failures};
  });
  fs.mkdirSync('evidence/review-1.0.0/fire',{recursive:true});fs.writeFileSync('evidence/review-1.0.0/fire/native-flame-pixels.json',JSON.stringify(report,null,2));
  expect(report.cases).toBe(288);expect(report.failures).toEqual([]);
});
