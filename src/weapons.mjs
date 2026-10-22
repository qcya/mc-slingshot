import {isIndestructible,TILE} from './config.mjs';
// Shared free-flight rules keep the aiming dots and the actual throw aligned.
export function launchVelocity(ammo,vx,vy){
 return {x:vx*(ammo.rangeScale??1)/60,y:vy*(ammo.liftScale??1)/60};
}
export const speedLimit=ammo=>ammo.id==='anvil'?22:26;
export function anvilFlight(M,p){
 if(p.ammo.id!=='anvil')return;
 // Staying upright does not change its natural airborne velocity.
 M.Body.setAngle(p.body,0);M.Body.setAngularVelocity(p.body,0);
}

export function recallTrident(world,p){
 if(p.dead||p.returning)return;
 p.returning=true;p.body.isSensor=true;
 world.M.Sleeping.set(p.body,false);world.M.Body.setAngularVelocity(p.body,0);
}

export function restAnvilOnEnemy(world,p,e){
 if(p.dead||p.restingOnEnemy||!e.alive)return;
 p.restingOnEnemy=e.id;p.plunging=false;p.expiresAt=world.time+5;p.fadeDuration=.8;
 p.body.isSensor=true;world.M.Body.setStatic(p.body,true);
 world.M.Body.setPosition(p.body,{x:e.body.position.x,y:anvilSupportY(e)-p.ammo.size/2});
 world.M.Body.setVelocity(p.body,{x:0,y:0});
}
export function anvilSupportY(e){
 // mobs.mjs moves the Shulker lid by 9 model units at its 2.7 sprite scale.
 return e.body.position.y-e.dimensions.height/2-(e.skin==='shulker'?24.3*(e.shellAmount||0):0);
}

function releaseAnvilCrush(world,p){
 const b=p.body;p.plunging=false;p.crushBottom=null;p.crushFront=null;b.isSensor=false;
 // Matter caches sensor state on pairs as well as on the body.
 for(const pair of world.engine.pairs.list)if(pair.bodyA.parent===b||pair.bodyB.parent===b){
  const other=pair.bodyA.parent===b?pair.bodyB.parent:pair.bodyA.parent;
  pair.isSensor=!!other.isSensor||other.plugin.entity?.type==='enemy';
 }
}

export function advanceWeapon(world,p,dt){
 const M=world.M,b=p.body;
 if(p.ammo.id==='trident'){
  if(!p.returning){
   // A passing apex is not a landing. Recall only after actual settling.
   const slow=b.isSleeping||Math.hypot(b.velocity.x,b.velocity.y)*60<12;
   p.stillFor=slow?(p.stillFor||0)+dt:0;
   if(p.stillFor>=.18)recallTrident(world,p);
  }
  if(p.returning){
   const dx=p.returnHome.x-b.position.x,dy=p.returnHome.y-b.position.y,d=Math.hypot(dx,dy);
   if(d<=1500*dt+8){p.returned=true;world.remove(p);world.events.push({type:'recall',x:p.returnHome.x,y:p.returnHome.y,sound:'trident_return'});return;}
   M.Sleeping.set(b,false);M.Body.setVelocity(b,{x:dx/d*25,y:dy/d*25});
   // Loyalty flies home on a straight line, unaffected by gravity or terrain.
   M.Body.applyForce(b,b.position,{x:-b.mass*world.engine.gravity.x*world.engine.gravity.scale,y:-b.mass*world.engine.gravity.y*world.engine.gravity.scale});
  }
 }
 if(p.ammo.id!=='anvil')return;
 anvilFlight(M,p);
 if(p.expiresAt<=world.time){world.remove(p);return;}
 if(p.restingOnEnemy){
  const target=world.enemies.find(e=>e.id===p.restingOnEnemy&&!e.dead&&e.alive);
  if(target){M.Body.setPosition(b,{x:target.body.position.x,y:anvilSupportY(target)-p.ammo.size/2});return;}
  p.restingOnEnemy=null;p.expiresAt=Infinity;M.Body.setStatic(b,false);b.isSensor=false;
 }
 if(!p.plunging||p.planted)return;
 // Each real floor impact owns one block of depth. Touching ground below that
 // block is still the same floor, so it cannot grant another carving budget.
 const velocity=210,half=p.ammo.size/2,left=Math.floor((b.position.x-TILE/2)/world.s),right=left+TILE/world.s;
 const limit=p.crushBottom??(p.crushBottom=Math.round((b.position.y+half)/world.s)*world.s+TILE);
 const top=Math.max(0,Math.floor((b.position.y-half)/world.s));
 let bottom=Math.min(world.grid.height,Math.ceil(Math.min(limit,b.position.y+half+velocity*dt)/world.s)),airGap=false;
 // Never bridge an actual empty row into another floor, even on a large step.
 // The frontier distinguishes real air from pixels this impact already cleared.
 for(let gy=p.crushFront/world.s;Number.isFinite(gy)&&gy<bottom;gy++){
  let solid=false;
  for(let gx=left;gx<right;gx++)if(world.sample((gx+.5)*world.s,(gy+.5)*world.s)){solid=true;break;}
  if(!solid&&world.debris.length)solid=world.drillDebrisStrip(left*world.s,gy*world.s,right*world.s,(gy+1)*world.s,true)>0;
  if(!solid){bottom=gy;airGap=true;break;}
 }
 let bedrock=Infinity,removed=0,touchingMaterial=false;
 // One extra pixel bridges the subpixel gap left by the previous voxel slice.
 const touchBottom=Math.min(world.grid.height,bottom+1);
 for(let gy=top;gy<touchBottom;gy++)for(let gx=left;gx<right;gx++){
  const material=world.debris.length?world.sample((gx+.5)*world.s,(gy+.5)*world.s):world.grid.get(gx,gy);
  if(material)touchingMaterial=true;
  if(gy<bottom&&isIndestructible(material))bedrock=Math.min(bedrock,gy*world.s);
 }
 // Moving debris pixels need not line up with the terrain's sample centres.
 if(!touchingMaterial&&world.debris.length)touchingMaterial=world.drillDebrisStrip(left*world.s,top*world.s,right*world.s,touchBottom*world.s,true)>0;
 if(!touchingMaterial){releaseAnvilCrush(world,p);return;}
 for(let gy=top;gy<bottom&&gy*world.s<bedrock;gy++)for(let gx=left;gx<right;gx++){
  const material=world.grid.get(gx,gy);if(!material||isIndestructible(material))continue;
  world.removeTerrainPixel(gx,gy);removed++;if(removed%24===0)world.emitPixel((gx+.5)*world.s,(gy+.5)*world.s,material);
 }
 if(world.debris.length)removed+=world.drillDebrisStrip(left*world.s,top*world.s,right*world.s,Math.min(bottom*world.s,bedrock));
 world.stats.removed+=removed;
 if(removed&&world.time>=(p.nextClink??0)){
  world.events.push({type:'impact',x:b.position.x,y:b.position.y+half,sound:'anvil_land',speed:550});p.nextClink=world.time+.22;
 }
 if(bedrock<Infinity){
  M.Body.setVelocity(b,{x:0,y:0});M.Body.setPosition(b,{x:b.position.x,y:bedrock-half});M.Body.setStatic(b,true);
  p.planted=true;p.expiresAt=world.time+.65;p.fadeDuration=.65;
  world.events.push({type:'impact',x:b.position.x,y:bedrock,sound:'anvil_land',speed:700});return;
 }
 p.crushFront=bottom*world.s;
 if(airGap){releaseAnvilCrush(world,p);return;}
 if(b.position.y+half+velocity*dt>=limit){
  // The next untouched pixel is a continuous floor only when material really
  // touches the bottom of this block. An air gap releases normal gravity.
  let supported=false;
  for(let gx=left;gx<right;gx++)if(world.sample((gx+.5)*world.s,limit+world.s/2)){supported=true;break;}
  M.Body.setPosition(b,{x:b.position.x,y:limit-half});
  if(supported){
   M.Body.setVelocity(b,{x:0,y:0});M.Body.setStatic(b,true);
   p.plunging=false;p.planted=true;p.expiresAt=world.time+.65;p.fadeDuration=.65;return;
  }
  releaseAnvilCrush(world,p);return;
 }
 b.isSensor=true;M.Sleeping.set(b,false);M.Body.setVelocity(b,{x:0,y:velocity/60});
 M.Body.applyForce(b,b.position,{x:-b.mass*world.engine.gravity.x*world.engine.gravity.scale,y:-b.mass*world.engine.gravity.y*world.engine.gravity.scale});
}

export function crystalSupported(world,p){
 const b=p.body,half=p.ammo.size/2;
 if(Math.abs(b.velocity.y)>2.5)return false;
 // A side face or a single corner cannot become an invisible shelf.
 return [-.55,0,.55].every(t=>world.sample(b.position.x+t*half,b.position.y+half+3));
}
