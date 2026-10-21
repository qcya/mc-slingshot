import {WIDTH,HEIGHT,PIXEL,MATERIALS} from './config.mjs';

// Distant terrain uses the same block textures, with opaque atmospheric tints.
// It never enters either destructible grid or the physics engine.
export function skyAndLandscape(ctx,assets){
  const sky=ctx.createLinearGradient(0,0,0,672);sky.addColorStop(0,'#79afe0');sky.addColorStop(1,'#b9d9ed');
  ctx.fillStyle=sky;ctx.fillRect(0,0,WIDTH,HEIGHT);
  const layer=(cell,profile,tint,veil)=>{
    const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
    for(let x=0;x<Math.ceil(WIDTH/cell);x++){
      const top=profile[Math.floor(x/2)%profile.length];
      for(let y=top;y<Math.ceil(672/cell);y++)c.drawImage(assets.images[y===top?'grass_block_side':y<top+3?'dirt':'stone'],x*cell,y*cell,cell,cell);
    }
    for(const tx of cell===24?[7,30,51]:[8,35]){
      const ground=profile[Math.floor(tx/2)%profile.length];
      for(let dy=1;dy<=4;dy++)c.drawImage(assets.images.oak_log,tx*cell,(ground-dy)*cell,cell,cell);
      for(const [dy,r] of [[-5,1],[-4,2],[-3,2],[-2,1]])for(let dx=-r;dx<=r;dx++)if(dy!==-2||dx!==0)c.drawImage(assets.images.oak_leaves,(tx+dx)*cell,(ground+dy)*cell,cell,cell);
    }
    c.globalCompositeOperation='source-atop';c.globalAlpha=veil;c.fillStyle=tint;c.fillRect(0,0,WIDTH,HEIGHT);ctx.drawImage(canvas,0,0);
  };
  layer(24,[23,22,20,20,18,17,17,18,19,19,21,23,24,24,23,21,20,20,19,18,19,21,22,23,22,20,18,18,19,20,22,23],'#bfd7e7',.78);
  layer(32,[19,19,18,18,17,16,16,17,18,19,19,18,18,17,18,19,19,18,17,17,16,17,18,19],'#bfd7e7',.55);
}
export function driftingClouds(ctx,time){
 for(const [start,y,w,speed] of [[-20,96,180,5],[400,66,270,3],[950,120,156,6],[1310,55,210,4]]){
  const x=(start+time*speed+250)%(WIDTH+500)-250;
  ctx.fillStyle='#e4edf7';ctx.fillRect(x,y+18,w,12);ctx.fillStyle='#fff';ctx.fillRect(x,y,w,21);ctx.fillRect(x+30,y-12,w-63,18);
 }
}

// Stable, noncolliding dimension scenery. Every silhouette is assembled from
// the same original block textures as the foreground, then pushed into haze.
export function dimensionLandscape(ctx,assets,dimension='overworld'){
 if(dimension==='overworld'){skyAndLandscape(ctx,assets);return;}
 ctx.fillStyle=dimension==='nether'?'#260d12':'#100c1d';ctx.fillRect(0,0,WIDTH,HEIGHT);
 const texture=(name,x,y,size)=>{const im=assets.images[name];if(im)ctx.drawImage(im,x,y,size,size);};
 const layer=(paint,tint,alpha)=>{
  const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  paint(c);c.globalCompositeOperation='source-atop';c.globalAlpha=alpha;c.fillStyle=tint;c.fillRect(0,0,WIDTH,HEIGHT);ctx.drawImage(canvas,0,0);
 };
 if(dimension==='sift'){
  const sky=ctx.createLinearGradient(0,0,0,HEIGHT);sky.addColorStop(0,'#253c50');sky.addColorStop(.65,'#658d91');sky.addColorStop(1,'#263d48');ctx.fillStyle=sky;ctx.fillRect(0,0,WIDTH,HEIGHT);
  layer(c=>{
   for(const [start,profile]of [[-1,[9,8,7,7,8,10]],[11,[12,11,10,10,11,12]],[25,[10,9,8,8,7,7,8]]])for(let dx=0;dx<profile.length;dx++)for(let y=profile[dx];y<18;y++)c.drawImage(assets.images.sift_siftslate,(start+dx)*48,y*48,48,48);
  },'#637c86',.78);
  layer(c=>{
   for(const [x,top]of [[70,320],[560,420],[1360,260]]){
    for(let y=top+32;y<700;y+=32)c.drawImage(assets.images.sift_overgrown_willow_log,x,y,32,32);
    for(const [dy,lo,hi]of [[0,-2,2],[1,-3,3],[2,-2,2]])for(let dx=lo;dx<=hi;dx++)c.drawImage(assets.images.sift_healthy_sculk,x+dx*32,top+dy*32,32,32);
   }
  },'#406b76',.7);
 }else if(dimension==='nether'){
  const glow=ctx.createLinearGradient(0,280,0,HEIGHT);glow.addColorStop(0,'#260d1200');glow.addColorStop(1,'#9c391b88');ctx.fillStyle=glow;ctx.fillRect(0,0,WIDTH,HEIGHT);
  layer(c=>{
   const floor=[13,13,12,12,11,10,10,9,9,10,10,11,12,12,12,11,10,9,9,10,10,11,12,12,11,10,10,11,12,13,13,13];
   const ceiling=[4,4,4,3,3,3,2,2,2,2,2,2,3,3,3,4,4,4,4,4,3,3,3,2,2,2,2,2,3,3,4,4];
   for(let x=0;x<32;x++){
    for(let y=floor[x];y<18;y++)c.drawImage(assets.images.netherrack,x*48,y*48,48,48);
    for(let y=0;y<ceiling[x];y++)c.drawImage(assets.images.netherrack,x*48,y*48,48,48);
   }
  },'#37151e',.82);
  layer(c=>{
   // Broad connected cliff faces, with no fake platforms or decorative lava.
   for(const [start,heights]of [[0,[11,11,12,12,13,14]],[23,[14,13,13,12,11,11,10,10,10]]])for(let dx=0;dx<heights.length;dx++)for(let y=heights[dx];y<18;y++)c.drawImage(assets.images.basalt_side,(start+dx)*48,y*48,48,48);
  },'#25131b',.84);
 }else{
  for(let i=0;i<55;i++){ctx.fillStyle=i%4?'#4a385c':'#6d5585';const x=(i*283+71)%WIDTH,y=(i*137+43)%540;ctx.fillRect(Math.floor(x/3)*3,Math.floor(y/3)*3,3,3);}
  layer(c=>{
   for(const [x,y,w] of [[-48,510,7],[350,570,6],[750,460,5],[1110,550,8]]){
    for(let dx=0;dx<w;dx++)c.drawImage(assets.images.end_stone,x+dx*24,y,24,24);
    for(let dy=1;dy<4;dy++)for(let dx=dy;dx<w-dy;dx++)c.drawImage(assets.images.end_stone,x+dx*24,y+dy*24,24,24);
   }
  },'#41354e',.77);
 }
 // Cavities reveal a darker matching world material below the common horizon.
 const under=dimension==='nether'?'blackstone':dimension==='sift'?'sift_siftslate':'end_stone';
 for(let x=0;x<32;x++)for(let y=14;y<18;y++)texture(under,x*48,y*48,48);
 ctx.fillStyle=dimension==='nether'?'#17090bd9':'#100b1cdd';ctx.fillRect(0,672,WIDTH,HEIGHT-672);
}

export function rearPixel(assets,m,x,y,world,visual){
  const p=assets.pixel(m,x,y);
  const average=assets.averages[MATERIALS[m].sprite];
  // Muted appliances stay legible against the darker, noncolliding back wall.
  // Neither layer brightens when foreground pixels disappear.
 const shade=[19,20,21,48,49,50].includes(m)?.65:m===45?.5:.42;
  return [0,1,2].map(c=>(average[c]*.35+p[c]*.65)*shade).concat(p[3]);
}

export function foregroundPixel(assets,m,x,y,grid,visual){
  const p=assets.pixel(m,x,y);if(y>=224||m===6)return p;
  let shade=1;
  if(!grid.get(x,y-1))shade*=1.12;
  if(!grid.get(x+1,y))shade*=.86;
  if(!grid.get(x,y+1))shade*=.76;
  return [p[0]*shade,p[1]*shade,p[2]*shade,p[3]];
}

export function contactShadows(ctx,world,sling){
  ctx.save();
  for(const e of world.enemies){
    if(!e.alive)continue;const x=e.body.position.x,feet=e.body.position.y+(e.feetOffset||46);
    for(let drop=0;drop<=30;drop+=PIXEL){
      if(!world.grid.get(x/PIXEL,(feet+drop)/PIXEL))continue;
      const y=Math.floor((feet+drop)/PIXEL)*PIXEL;ctx.globalAlpha=.27*(1-drop/36);ctx.fillStyle='#19201c';
      ctx.fillRect(Math.round((x-18)/PIXEL)*PIXEL,y,36,3);ctx.fillRect(Math.round((x-12)/PIXEL)*PIXEL,y+3,24,3);break;
    }
  }
  if(world.grid.get(sling.x/PIXEL,224)){
    ctx.globalAlpha=.25;ctx.fillStyle='#282017';ctx.fillRect(sling.x-18,672,48,3);ctx.fillRect(sling.x-12,675,36,3);
  }
  ctx.restore();
}
