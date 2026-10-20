import {BLOCK} from './config.mjs';

import {heavyMob,damageEnemy,fireImmune} from './combat.mjs';
// Only wood products burn. Stone appliances, soil and decorative foliage do not.
export const isCombustible=m=>[4,10,12,13,14,15,17,18,19,21,22,23].includes(m);

function woodPixels(world,tx,ty){
 const pixels=[];
 for(let y=ty*BLOCK;y<(ty+1)*BLOCK;y++)for(let x=tx*BLOCK;x<(tx+1)*BLOCK;x++){
  const m=world.grid.get(x,y);if(isCombustible(m))pixels.push({x,y,m});
 }
 return pixels;
}

function addFire(world,tx,ty,pixels,sourceId,seedX,seedY,depth=0,surfaceY=null){
 const existing=world.fires.find(f=>f.tx===tx&&f.ty===ty&&f.surfaceY===surfaceY);
 if(existing){existing.sourceIds.add(sourceId);return false;}
 const tileSize=BLOCK*world.s,startedAt=world.time+depth*.13;
 // A deterministic shuffled removal order reveals individual burning pixels.
 pixels.sort((a,b)=>((a.x*73+a.y*151)%257)-((b.x*73+b.y*151)%257));
 world.fires.push({id:++world.fireSerial,sourceIds:new Set([sourceId]),tx,ty,x:tx*tileSize,y:surfaceY===null?ty*tileSize:surfaceY-tileSize,size:tileSize,surfaceY,
  startedAt,endsAt:startedAt+2.8,seedX,seedY,pixels,burned:0,nextSoundAt:startedAt+.6});
 return true;
}

// The impact normal points out of the struck surface toward the projectile.
// Wood burns in its five-cell footprint. Nonwood walls do not catch fire;
// a ground hit leaves only a supported horizontal row of surface flames.
function hasSurface(world,tx,footY){
 for(let i=0;i<BLOCK;i++){
  const x=(tx*BLOCK+i+.5)*world.s;
  if(world.sample(x,footY+world.s/2)&&!world.sample(x,footY-world.s/2))return true;
 }
 return false;
}
export function igniteImpact(world,x,y,normal,sourceId){
 const tileSize=BLOCK*world.s,dx=Math.abs(normal.x)>=Math.abs(normal.y)?Math.sign(normal.x):0,dy=dx?0:Math.sign(normal.y);
 const hitX=x-dx*world.s/2,hitY=y-dy*world.s/2;
 const material=world.sample(hitX,hitY);
 if(isCombustible(material)&&igniteWood(world,hitX,hitY,world.s,sourceId))return true;
 if(dx||dy!==-1)return false;
 const tx=Math.floor(hitX/tileSize),surfaceY=Math.floor(hitY/world.s)*world.s,ty=Math.floor((surfaceY-.5)/tileSize);
 let added=false;
 for(const ox of [-1,0,1])if(hasSurface(world,tx+ox,surfaceY))added=addFire(world,tx+ox,ty,[],sourceId,tx,ty,0,surfaceY)||added;
 if(added)world.events.push({type:'fire',x,y,sound:'fire_burn'});
 return true;
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
 let added=0,touched=0;
 for(const [dx,dy]of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){
  const tx=seed.tx+dx,ty=seed.ty+dy,depth=dx||dy?1:0;
  const pixels=woodPixels(world,tx,ty);if(!pixels.length)continue;
  if(addFire(world,tx,ty,pixels,sourceId,seed.tx,seed.ty,depth))added++;
  touched++;
 }
 if(added)world.events.push({type:'fire',x,y,sound:'fire_burn'});
 return touched>0;
}

// A charge grants exactly three delayed ticks, even if the victim remains in
// its flames or overlaps several burning tiles. A later charge is independent.
export function burnEnemy(world,enemy,sourceId){
 if(!enemy.alive||enemy.dead||fireImmune(enemy)||enemy.burnSources.has(sourceId))return false;
 enemy.burnSources.add(sourceId);
 if(enemy.skin==='enderman'){damageEnemy(world,enemy,100,{source:sourceId,kind:'fire'});return true;}
 for(let tick=1;tick<=3;tick++)enemy.burnTicks.push({at:world.time+tick*.6,damage:heavyMob(enemy)?50:100/3});
 enemy.burningUntil=Math.max(enemy.burningUntil,world.time+1.8);return true;
}

export function splashWater(world,x,y,radius=96){
 world.fires=world.fires.filter(f=>Math.hypot(f.x+f.size/2-x,f.y+f.size/2-y)>radius+f.size/2);
 for(const enemy of world.enemies){if(Math.hypot(enemy.body.position.x-x,enemy.body.position.y-y)>radius+enemy.dimensions.width/2)continue;enemy.burnTicks.length=0;enemy.burningUntil=0;}
 world.lava.cool(x,y,radius);world.events.push({type:'splash',x,y,radius,sound:'water_splash'});
}

export function advanceFire(world){
 for(const fire of world.fires){
  if(world.time<fire.startedAt)continue;
  if(fire.surfaceY!==null&&!hasSurface(world,fire.tx,fire.surfaceY)){fire.endsAt=world.time;continue;}
  for(const enemy of world.enemies){
   const b=enemy.body.bounds;
   if(b.max.x<fire.x||b.min.x>fire.x+fire.size||b.max.y<fire.y||b.min.y>fire.y+fire.size)continue;
   for(const sourceId of fire.sourceIds)burnEnemy(world,enemy,sourceId);
  }
  const progress=Math.min(1,(world.time-fire.startedAt)/2.8),target=Math.floor(progress*fire.pixels.length);
  while(fire.burned<target){
   const p=fire.pixels[fire.burned++],m=world.grid.get(p.x,p.y);
   if(!isCombustible(m))continue;world.removeTerrainPixel(p.x,p.y);world.stats.removed++;
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
   if(tick.at>world.time+1e-9)return true;damageEnemy(world,enemy,tick.damage,{kind:'fire'});return false;
  });
  if(!enemy.burnTicks.length)enemy.burningUntil=0;
 }
}
