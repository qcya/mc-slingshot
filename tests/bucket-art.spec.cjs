const {test,expect}=require('@playwright/test');
const fs=require('node:fs');

test('native bucket sprite stays readable at 28px in flight and in the pouch',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:850,height:420});
  await page.goto('/src/assets.mjs');
  const result=await page.evaluate(async()=>{
    const base=document.createElement('base');base.href='/';document.head.appendChild(base);
    const [{Assets},{Renderer},{AMMO}]=await Promise.all([import('/src/assets.mjs'),import('/src/renderer.mjs'),import('/src/config.mjs')]);
    const assets=await new Assets().load(),ammo=AMMO.find(a=>a.id==='lava_bucket');
    document.body.innerHTML='<canvas id="proof" width="850" height="420"></canvas>';
    document.body.style.cssText='margin:0;background:#17232a';
    const canvas=document.querySelector('canvas'),c=canvas.getContext('2d'),renderer=new Renderer(canvas,assets);
    c.imageSmoothingEnabled=false;c.fillStyle='#d8e2d5';c.fillRect(0,0,850,420);
    c.fillStyle='#1d3028';c.font='18px monospace';c.fillText('Original Java 1.20.4 item textures',24,30);
    c.font='14px monospace';c.fillText('Native 16px     Gameplay 28px       Enlarged 96px',24,64);
    for(const [row,name]of ['lava_bucket','bucket'].entries())for(const [x,size]of [[50,16],[205,28],[365,96]])c.drawImage(assets.images[name],x,90+row*130,size,size);
    c.fillText('Loaded pouch, 28px',555,64);
    c.save();c.translate(390,-390);renderer.launcher({pouch:{x:285,y:545},ammo,loaded:true,drag:false},{});c.restore();
    c.fillText('Direct flight sprite',555,290);renderer.ball(665,335,ammo);
    const direct=document.createElement('canvas');direct.width=direct.height=28;const dc=direct.getContext('2d');dc.imageSmoothingEnabled=false;dc.drawImage(assets.images.lava_bucket,0,0,28,28);
    const actual=document.createElement('canvas');actual.width=actual.height=28;const ac=actual.getContext('2d');ac.imageSmoothingEnabled=false;
    Renderer.prototype.ball.call({image:Renderer.prototype.image,ctx:ac,assets},14,14,ammo);
    const originalPixels=dc.getImageData(0,0,28,28).data,renderedPixels=ac.getImageData(0,0,28,28).data;
    const same=originalPixels.every((n,i)=>n===renderedPixels[i]);
    const sound=await fetch('/assets/sfx/bucket_empty_lava.ogg').then(r=>r.arrayBuffer());
    const audio=new AudioContext(),decoded=await audio.decodeAudioData(sound);await audio.close();
    return {same,size:ammo.size,full:[assets.images.lava_bucket.width,assets.images.lava_bucket.height],empty:[assets.images.bucket.width,assets.images.bucket.height],iconIsNative:assets.icons.lava_bucket===assets.images.lava_bucket,legacyAnvil:!!assets.images.anvil,soundLoaded:!!assets.sounds.bucket_empty_lava,duration:decoded.duration};
  });
  expect(result).toMatchObject({same:true,size:28,full:[16,16],empty:[16,16],iconIsNative:true,legacyAnvil:true,soundLoaded:true});
  expect(result.duration).toBeGreaterThan(.1);expect(errors).toEqual([]);
  const dir='evidence/review-0.15.0-beta7/art';fs.mkdirSync(dir,{recursive:true});
  await page.screenshot({path:`${dir}/native-bucket-pouch.png`});
  fs.writeFileSync(`${dir}/native-bucket-assets.json`,JSON.stringify({...result,errors},null,2));
});
