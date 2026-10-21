// Shared launch rules keep the aiming preview and the real throw in agreement.
export function launchVelocity(ammo,vx,vy){
 return {x:vx*(ammo.rangeScale??1)/60,y:vy*(ammo.liftScale??1)/60};
}
export const speedLimit=ammo=>ammo.id==='anvil'?32:26;
export function anvilFlight(M,p){
 const b=p.body;if(p.ammo.id!=='anvil'||p.planted)return;
 if(!p.plunging&&p.age>=.45-1e-8&&b.velocity.y>=0)p.plunging=true;
 if(p.plunging){
  M.Sleeping.set(b,false);M.Body.setAngle(b,0);M.Body.setAngularVelocity(b,0);
  M.Body.setVelocity(b,{x:0,y:Math.max(14,b.velocity.y)});
 }
}

export function recallTrident(world,p){
 if(p.dead||p.returning)return;
 p.returning=true;p.body.isSensor=true;
 world.M.Sleeping.set(p.body,false);world.M.Body.setAngularVelocity(p.body,0);
}

export function advanceWeapon(world,p,dt){
 const M=world.M,b=p.body;
 if(p.ammo.id==='trident'){
  if(!p.returning&&(p.age>=1.45||p.age>.85&&b.velocity.y>=0))recallTrident(world,p);
  if(p.returning){
   const dx=p.returnHome.x-b.position.x,dy=p.returnHome.y-b.position.y,d=Math.hypot(dx,dy);
   if(d<=1500*dt+8){p.returned=true;world.remove(p);world.events.push({type:'recall',x:p.returnHome.x,y:p.returnHome.y,sound:'trident_return'});return;}
   M.Sleeping.set(b,false);M.Body.setVelocity(b,{x:dx/d*25,y:dy/d*25});
   // Loyalty flies home on a straight line, unaffected by gravity or terrain.
   M.Body.applyForce(b,b.position,{x:-b.mass*world.engine.gravity.x*world.engine.gravity.scale,y:-b.mass*world.engine.gravity.y*world.engine.gravity.scale});
  }
 }
 if(p.ammo.id==='anvil'&&!p.planted){
  anvilFlight(M,p);
  if(p.plunging){
   const half=p.ammo.size/2,left=Math.floor((b.position.x-half)/world.s),right=Math.ceil((b.position.x+half)/world.s);
   const top=Math.max(0,Math.floor((b.position.y-half)/world.s)),bottom=Math.min(world.grid.height,Math.ceil((b.position.y+half+32*60*dt)/world.s));
   let bedrock=Infinity,removed=0;
   // Find the first bedrock surface across the complete footprint before digging.
   for(let gy=top;gy<bottom;gy++)for(let gx=left;gx<right;gx++)if(world.grid.get(gx,gy)===7)bedrock=Math.min(bedrock,gy*world.s);
   for(let gy=top;gy<bottom&&gy*world.s<bedrock;gy++)for(let gx=left;gx<right;gx++){
    const material=world.grid.get(gx,gy);if(!material||material===7)continue;
    world.removeTerrainPixel(gx,gy);removed++;
    if(removed%32===0)world.emitPixel((gx+.5)*world.s,(gy+.5)*world.s,material);
   }
   world.stats.removed+=removed;
   if(bedrock<Infinity){
    M.Body.setPosition(b,{x:b.position.x,y:bedrock-half});M.Body.setVelocity(b,{x:0,y:0});M.Body.setStatic(b,true);p.planted=true;
    world.events.push({type:'impact',x:b.position.x,y:bedrock,sound:'anvil_land',speed:840});
   }
  }
 }
}

export function crystalSupported(world,p){
 const b=p.body,half=p.ammo.size/2;
 if(Math.abs(b.velocity.y)>2.5)return false;
 // A side face or a single corner cannot become an invisible shelf.
 return [-.55,0,.55].every(t=>world.sample(b.position.x+t*half,b.position.y+half+3));
}
