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

export function rearPixel(assets,m,x,y,world,visual){
  const p=assets.pixel(m,x,y);
  if(m===23){const alpha=assets.colors.ladder[((y&15)*16+(x&15))*4+3];if(!alpha)return rearPixel(assets,10,x,y,world,visual);}
  if(m>=19)return [p[0]*.91,p[1]*.91,p[2]*.91,p[3]];
  if(y>=224)return [p[0]*.48,p[1]*.48,p[2]*.48,p[3]];
  const average=assets.averages[MATERIALS[m].sprite],gable=visual?.gables.has((y>>4)*32+(x>>4));
  const room=visual?.rooms.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
  let light=gable?.49:.73;
  if(room){
    if(room.y+room.h-y<4)light*=.79;
    const opening=world.grid.get(room.x-8,y);
    if(opening===0||opening===6)light+=Math.max(0,1-(x-room.x)/45)*.13;
  }
  for(let d=1;d<=9;d++)if(world.grid.get(x,y-d)){light*=.68+.32*d/10;break;}
  return [0,1,2].map(c=>(average[c]*.65+p[c]*.35)*light).concat(p[3]);
}

export function foregroundPixel(assets,m,x,y,grid,visual){
  const p=assets.pixel(m,x,y);if(y>=224||m===6)return p;
  let shade=visual?.roofTiles.has((y>>4)*32+(x>>4))?.68:1;
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
