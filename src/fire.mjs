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
// at startedAt. sourceIds deduplicate one charge across the whole wood cluster.
// `fire` events carry {x,y,sound:'fire_burn'}; launching has its own sound.
export function igniteWood(world,x,y,reach=world.s*2,sourceId){
 const tileSize=BLOCK*world.s,choices=[];
 for(let ty=Math.floor((y-reach)/tileSize);ty<=Math.floor((y+reach)/tileSize);ty++)
  for(let tx=Math.floor((x-reach)/tileSize);tx<=Math.floor((x+reach)/tileSize);tx++){
   const pixels=woodPixels(world,tx,ty);if(!pixels.length)continue;
   const distance=Math.min(...pixels.map(p=>Math.hypot((p.x+.5)*world.s-x,(p.y+.5)*world.s-y)));
   if(distance<=reach)choices.push({tx,ty,pixels,distance});
  }
 choices.sort((a,b)=>a.distance-b.distance);const seed=choices[0];if(!seed)return false;
 sourceId??=`wood:${++world.fireSerial}`;
 const seen=new Set(),queue=[{...seed,depth:0}];let added=0,touched=0;
 for(let i=0;i<queue.length;i++){
  const {tx,ty,depth}=queue[i],key=`${tx}:${ty}`;
  if(seen.has(key)||Math.hypot(tx-seed.tx,ty-seed.ty)>2)continue;seen.add(key);
  const pixels=woodPixels(world,tx,ty);if(!pixels.length)continue;
  const existing=world.fires.find(f=>f.tx===tx&&f.ty===ty);
  if(existing)existing.sourceIds.add(sourceId);
  else{
   const startedAt=world.time+depth*.13;
   // A deterministic shuffled removal order reveals individual burning pixels.
   pixels.sort((a,b)=>((a.x*73+a.y*151)%257)-((b.x*73+b.y*151)%257));
   world.fires.push({id:++world.fireSerial,sourceIds:new Set([sourceId]),tx,ty,x:tx*tileSize,y:ty*tileSize,size:tileSize,
    startedAt,endsAt:startedAt+2.8,seedX:seed.tx,seedY:seed.ty,pixels,burned:0,nextSoundAt:startedAt+.6});added++;
  }
  touched++;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({tx:tx+dx,ty:ty+dy,depth:depth+1});
 }
 if(added)world.events.push({type:'fire',x,y,sound:'fire_burn'});
 return touched>0;
}

// A charge grants exactly three delayed ticks, even if the victim remains in
// its flames or overlaps several burning tiles. A later charge is independent.
export function burnEnemy(world,enemy,sourceId){
 if(!enemy.alive||enemy.dead||enemy.burnSources.has(sourceId))return false;
 enemy.burnSources.add(sourceId);
 for(let tick=1;tick<=3;tick++)enemy.burnTicks.push({at:world.time+tick*.6,damage:enemy.skin==='warden'?50:100/3});
 enemy.burningUntil=Math.max(enemy.burningUntil,world.time+1.8);return true;
}

export function advanceFire(world){
 for(const fire of world.fires){
  if(world.time<fire.startedAt)continue;
  for(const enemy of world.enemies){
   const b=enemy.body.bounds;
   if(b.max.x<fire.x||b.min.x>fire.x+fire.size||b.max.y<fire.y||b.min.y>fire.y+fire.size)continue;
   for(const sourceId of fire.sourceIds)burnEnemy(world,enemy,sourceId);
  }
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
 for(const enemy of world.enemies){
  if(!enemy.alive||enemy.dead){enemy.burnTicks.length=0;enemy.burningUntil=0;continue;}
  enemy.burnTicks=enemy.burnTicks.filter(tick=>{
   if(tick.at>world.time+1e-9)return true;world.hurt(enemy,tick.damage);return false;
  });
  if(!enemy.burnTicks.length)enemy.burningUntil=0;
 }
}
