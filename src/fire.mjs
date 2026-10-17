import {BLOCK} from './config.mjs';

// Only wood products burn. Stone appliances, soil and decorative foliage do not.
export const isCombustible=m=>[4,10,12,13,14,15,17,18,19,21,22,23].includes(m);

function woodPixels(world,tx,ty){
 const pixels=[];
 for(const layer of ['front','rear']){
  const grid=layer==='front'?world.grid:world.rear.grid;
  for(let y=ty*BLOCK;y<(ty+1)*BLOCK;y++)for(let x=tx*BLOCK;x<(tx+1)*BLOCK;x++){
   const m=grid.get(x,y);if(isCombustible(m))pixels.push({layer,x,y,m});
  }
 }
 return pixels;
}

// Public renderer contract: world.fires contains world-space tile rectangles
// {id,tx,ty,x,y,size,startedAt,endsAt,seedX,seedY}. Delayed records become visible
// at startedAt. `fire` events carry {x,y,sound:'fire_ignite'|'fire_burn'}.
export function igniteWood(world,x,y,reach=world.s*2){
 const tileSize=BLOCK*world.s,choices=[];
 for(let ty=Math.floor((y-reach)/tileSize);ty<=Math.floor((y+reach)/tileSize);ty++)
  for(let tx=Math.floor((x-reach)/tileSize);tx<=Math.floor((x+reach)/tileSize);tx++){
   const pixels=woodPixels(world,tx,ty);if(!pixels.length)continue;
   const distance=Math.min(...pixels.map(p=>Math.hypot((p.x+.5)*world.s-x,(p.y+.5)*world.s-y)));
   if(distance<=reach)choices.push({tx,ty,pixels,distance});
  }
 choices.sort((a,b)=>a.distance-b.distance);const seed=choices[0];if(!seed)return false;
 const seen=new Set(),queue=[{...seed,depth:0}];let added=0;
 for(let i=0;i<queue.length;i++){
  const {tx,ty,depth}=queue[i],key=`${tx}:${ty}`;
  if(seen.has(key)||Math.hypot(tx-seed.tx,ty-seed.ty)>3)continue;seen.add(key);
  const pixels=woodPixels(world,tx,ty);if(!pixels.length)continue;
  if(!world.fires.some(f=>f.tx===tx&&f.ty===ty)){
   const startedAt=world.time+depth*.13;
   // A deterministic shuffled removal order reveals individual burning pixels.
   pixels.sort((a,b)=>((a.x*73+a.y*151)%257)-((b.x*73+b.y*151)%257));
   world.fires.push({id:++world.fireSerial,tx,ty,x:tx*tileSize,y:ty*tileSize,size:tileSize,
    startedAt,endsAt:startedAt+2.8,seedX:seed.tx,seedY:seed.ty,pixels,burned:0,nextSoundAt:startedAt+.6});added++;
  }
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({tx:tx+dx,ty:ty+dy,depth:depth+1});
 }
 if(added)world.events.push({type:'fire',x,y,sound:'fire_ignite'});
 return added>0;
}

export function advanceFire(world){
 for(const fire of world.fires){
  if(world.time<fire.startedAt)continue;
  const progress=Math.min(1,(world.time-fire.startedAt)/2.8),target=Math.floor(progress*fire.pixels.length);
  while(fire.burned<target){
   const p=fire.pixels[fire.burned++],grid=p.layer==='front'?world.grid:world.rear.grid,m=grid.get(p.x,p.y);
   if(!isCombustible(m))continue;grid.set(p.x,p.y,0);
   if(p.layer==='front')world.stats.removed++;else world.stats.backgroundRemoved++;
   if(fire.burned%23===0)world.emitPixel((p.x+.5)*world.s,(p.y+.5)*world.s,m,.35);
  }
  if(world.time>=fire.nextSoundAt){
   fire.nextSoundAt=world.time+1.2;
   // One quiet crackle per cluster avoids saturating the shared audio pool.
   if(fire.tx===fire.seedX&&fire.ty===fire.seedY)world.events.push({type:'fire',x:fire.x+fire.size/2,y:fire.y+fire.size/2,sound:'fire_burn'});
  }
 }
 world.fires=world.fires.filter(f=>world.time<f.endsAt);
}
