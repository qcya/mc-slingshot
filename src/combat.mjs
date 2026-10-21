import {ENCOUNTER_PROFILES,initEncounter,encounterDamageMultiplier} from './encounters.mjs';
// Gameplay profiles are deliberately separate from atlas and animation data.
export const MOB_PROFILES={
 zombie:{width:32,height:92,mass:1.2,hp:100},pillager:{width:32,height:92,mass:1.2,hp:100},
 zombified_piglin:{width:32,height:92,mass:1.2,hp:100,fireImmune:true},
 warden:{width:58,height:132,mass:3.6,hp:300,armored:true},
 hoglin:{width:90,height:84,mass:3.6,hp:300,armored:true},
 shulker:{width:48,height:48,mass:4,hp:300,armored:true},
 enderman:{width:32,height:132,mass:1.5,hp:200,armored:true},...ENCOUNTER_PROFILES
};
export const profileFor=skin=>MOB_PROFILES[skin]||MOB_PROFILES.zombie;
export const heavyMob=e=>e.skin==='warden'||e.skin==='hoglin'||!!profileFor(e.skin).heavy;
export const armoredMob=e=>!!profileFor(e.skin).armored;
export const fireImmune=e=>!!profileFor(e.skin).fireImmune;
// Walking enemies must not turn a resting object into a fresh weapon.
export const MIN_PROJECTILE_HIT_SPEED=180;
export function projectileOpacity(p,time){return p.ammo.id==='ender'?Math.max(0,Math.min(1,1-(time-p.expiresAt)/.75)):1;}
export function projectileBody(M,ammo,x,y,options={}){
 const square=ammo.shape==='box'||['cobble','tnt'].includes(ammo.id);
 return square?M.Bodies.rectangle(x,y,ammo.size,ammo.size,options):M.Bodies.circle(x,y,ammo.size/2,options,16);
}
// Matter gives all masses the same acceleration; the anvil has an explicit
// gravity multiplier shared by real flight and the aiming preview.
export function projectileGravity(M,body,ammo,gravity){
 const extra=(ammo.gravityScale??1)-1;if(!extra)return;
 M.Body.applyForce(body,body.position,{x:body.mass*gravity.x*gravity.scale*extra,y:body.mass*gravity.y*gravity.scale*extra});
}
function random(e){e.combatSeed=(Math.imul(e.combatSeed,1664525)+1013904223)>>>0;return e.combatSeed/4294967296;}
export function initCombat(e,time,options){
 e.combatSeed=(e.id*2654435761)>>>0;e.hitSources=new Set();e.frozen=false;
 initEncounter(e,time,options);
 if(e.skin==='shulker'){e.stationary=true;e.shellOpen=false;e.shellUntil=time+2.4+random(e)*1.8;e.shellAmount=0;}
 if(e.skin==='enderman'){e.teleportCount=0;e.teleportSpots=(options.teleportSpots||[]).map(p=>({...p}));}
}
export function freezeEnemy(world,e){
 if(!e.alive||e.dead||e.frozen)return false;
 e.frozen=true;e.freezeAt=world.time;e.burnTicks.length=0;e.burningUntil=0;
 world.M.Body.setVelocity(e.body,{x:0,y:0});world.M.Body.setAngularVelocity(e.body,0);
 // Clear the last collision's warm-start displacement before making it static.
 e.body.positionImpulse.x=0;e.body.positionImpulse.y=0;
 world.M.Body.setStatic(e.body,true);
 world.events.push({type:'snow',x:e.body.position.x,y:e.body.position.y,radius:e.dimensions.width/2+8});
 return true;
}
export function thawEnemy(world,e){
 if(!e.frozen)return false;
 e.frozen=false;world.M.Body.setStatic(e.body,false);world.M.Sleeping.set(e.body,false);
 // Resume the pose and shell cycle where they were frozen, without a timer jump.
 const duration=world.time-e.freezeAt;e.actionUntil+=duration;if(e.actionStart!==undefined)e.actionStart+=duration;
 if(e.shellUntil!==undefined)e.shellUntil+=duration;e.lastX=e.body.position.x;
 world.events.push({type:'snow',x:e.body.position.x,y:e.body.position.y,radius:e.dimensions.width/2+8});
 return true;
}
export function advanceCombat(world,e,dt){
 if(e.skin==='shulker'){
  if(world.time>=e.shellUntil){e.shellOpen=!e.shellOpen;e.shellUntil=world.time+(e.shellOpen?1.8:2.4)+random(e)*1.8;world.events.push({type:'ambient',sound:e.shellOpen?'shulker_open':'shulker_close'});}
  e.shellAmount+=(Number(e.shellOpen)-e.shellAmount)*Math.min(1,dt*8);
  e.pose={...e.pose,openAmount:e.shellAmount};
 }
}
export function teleportSpotValid(world,e,spot){
 if(!Number.isFinite(spot?.x)||!Number.isFinite(spot?.feet))return false;
 const half=e.dimensions.width/2,left=spot.x-half,right=spot.x+half,top=spot.feet-e.dimensions.height;
 if(left<3||right>world.width-3||top<3||spot.feet>world.height-3)return false;
 // Check all foreground pixels; a narrow roof fragment cannot be skipped.
 for(let gy=Math.floor(top/world.s);gy<Math.ceil(spot.feet/world.s);gy++)for(let gx=Math.floor(left/world.s);gx<Math.ceil(right/world.s);gx++)if(world.grid.get(gx,gy))return false;
 for(const other of [...world.debris,...world.enemies]){
  if(other===e||other.dead||other.type==='enemy'&&!other.alive)continue;
  const b=other.body.bounds;if(b.max.x>left&&b.min.x<right&&b.max.y>top&&b.min.y<spot.feet)return false;
 }
 if(!world.sample(left+3,spot.feet+2)||!world.sample(right-3,spot.feet+2))return false;
 for(const cell of world.lava?.cells.values()||[])if(cell.x<right&&cell.x+cell.size>left&&cell.y<spot.feet&&cell.y+cell.size>top)return false;
 return true;
}
export function teleportEnemy(world,e){
 const spots=[];
 for(const p of e.teleportSpots)if(teleportSpotValid(world,e,p)&&!spots.some(s=>Math.hypot(s.x-p.x,s.feet-p.feet)<40))spots.push(p);
 // Destruction may invalidate authored places: bounded scan of existing ledges.
 if(spots.length<3){
  for(let x=240;x<world.width-32&&spots.length<12;x+=48)for(let feet=144;feet<world.height-3;feet+=48){
   const p={x,feet};if(teleportSpotValid(world,e,p)&&!spots.some(s=>Math.hypot(s.x-x,s.feet-feet)<40))spots.push(p);
  }
 }
 const possible=spots.filter(p=>Math.hypot(p.x-e.body.position.x,p.feet-e.body.bounds.max.y)>48);
 if(!possible.length)return false;
 const target=possible[Math.floor(random(e)*possible.length)],old={...e.body.position};
 world.M.Body.setPosition(e.body,{x:target.x,y:target.feet-e.feetOffset});world.M.Body.setVelocity(e.body,{x:0,y:0});world.M.Sleeping.set(e.body,false);
 e.lastX=target.x;e.externalUntil=world.time+.2;e.teleportCount++;
 world.events.push({type:'portal',x:old.x,y:old.y,to:{...e.body.position}});return true;
}
// One source is one hit, even when it creates several collisions or burn ticks.
export function damageEnemy(world,e,damage,{source=null,kind='environment'}={}){
 if(!e.alive||e.dead||!Number.isFinite(damage)||damage<3)return false;
 if(fireImmune(e)&&['fire','lava'].includes(kind))return false;
 if(source&&e.hitSources.has(source))return false;
 if(source)e.hitSources.add(source);
 if(e.skin==='enderman'&&!['environment','lava'].includes(kind)){
  if(!e.teleportCount){world.hurt(e,100);teleportEnemy(world,e);return true;}
  world.hurt(e,e.hp);return true;
 }
 if(e.skin==='shulker'&&e.shellAmount>=.5&&['cobble','slimeball','anvil','ender','trident'].includes(kind))damage=e.hp;
 world.hurt(e,damage*encounterDamageMultiplier(e,kind));return true;
}
export function projectileDamage(world,target,p,speed){
 const kind=p.ammo.id;
 if(['tnt','fire','snowball','wind','water','crystal'].includes(kind))return;
 const velocity=world.before.get(p.body.id)||p.body.velocity;
 if(Math.hypot(velocity.x,velocity.y)*60<MIN_PROJECTILE_HIT_SPEED)return false;
 const hitId=kind==='trident'?`${p.id}:${p.returning?'return':'outbound'}`:p.id;
 if(target.projectileHits.has(hitId))return;
 target.projectileHits.add(hitId);
 const armored=armoredMob(target),damage=kind==='anvil'?150:armored?(kind==='ender'?75:100):250;
 return damageEnemy(world,target,damage,{source:`ammo:${hitId}`,kind});
}
export function gust(world,x,y,radius=125){
 // The wind burst reaches through walls, including a crystal on the far side.
 world.detonateCrystals(world.projectiles.filter(p=>!p.dead&&p.ammo.id==='crystal'&&Math.hypot(p.body.position.x-x,p.body.position.y-y)<=radius));
 for(const e of world.allMoving()){
  if(e.frozen)continue;
  const dx=e.body.position.x-x,dy=e.body.position.y-y,d=Math.hypot(dx,dy);if(d>radius)continue;
  const force=(1-d/radius)*Math.min(9,15/Math.sqrt(e.body.mass));
  world.M.Sleeping.set(e.body,false);world.M.Body.setVelocity(e.body,{x:e.body.velocity.x+(d>2?dx/d:1)*force,y:e.body.velocity.y+(d>2?dy/d:0)*force-force*.65});e.externalUntil=world.time+1;
 }
 world.events.push({type:'gust',x,y,radius,sound:'wind_burst'});
}
