// Sift species/geometry come from Mielon's MIT-licensed community mod.
// Their encounter roles and all boss phases below are adaptations for this game.
export const ENCOUNTER_PROFILES={
 wither:{width:112,height:88,mass:5,hp:450,armored:true,heavy:true,fireImmune:true,flying:true,boss:true,label:'凋灵'},
 wither_skeleton:{width:32,height:116,mass:1.3,hp:100,fireImmune:true,label:'凋灵骷髅'},
 ender_dragon:{width:214,height:110,mass:8,hp:600,armored:true,heavy:true,fireImmune:true,flying:true,boss:true,label:'末影龙'},
 sift_blub:{width:44,height:48,mass:1,hp:100,label:'布鲁布'},
 sift_sifter:{width:52,height:46,mass:1.3,hp:100,label:'筛行兽'},
 sift_singer:{width:64,height:146,mass:2.5,hp:200,armored:true,elite:true,label:'吟唱者'},
 sift_echo_golem:{width:96,height:114,mass:6,hp:450,armored:true,heavy:true,boss:true,label:'回声傀儡'}
};
const bound=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function initEncounter(e,time,options={}){
 const profile=ENCOUNTER_PROFILES[e.skin];if(!profile)return;
 e.encounterStart=time;e.encounterPhase='patrol';e.encounterPulseCycle=-1;
 e.encounterHome={x:e.body.position.x,y:e.body.position.y};
 if(e.skin==='ender_dragon')e.healingCrystalSpots=(options.healingCrystals||[]).map(p=>({...p}));
 if(e.skin==='sift_echo_golem'){
  e.facing=-1;e.encounterPhase='telegraph';e.echoPhaseUntil=time+1.1;
  e.echoShieldActive=false;e.echoRecoveryUntil=0;
 }
 if(profile.flying){
  e.flying=true;
  // Bounds describe the body's centre. Authored maps leave the entire box clear.
  e.flightBounds={left:e.body.position.x-110,right:e.body.position.x+110,top:Math.max(120,e.body.position.y-230),bottom:e.body.position.y,...options.flightBounds};
 }
 if(profile.elite||e.skin==='sift_echo_golem')e.stationary=true;
}
// Called after addEnemy registers and appends the actor. These use the exact
// player crystal bodies and destruction rules, never a separate invulnerable prop.
export function setupEncounter(world,e){
 if(e.skin!=='ender_dragon'||e.encounterSetup)return;
 e.encounterSetup=true;
 for(const spot of e.healingCrystalSpots||[]){
  if(!Number.isFinite(spot.x)||!Number.isFinite(spot.feet))continue;
  if(![-7.7,0,7.7].every(dx=>world.sample(spot.x+dx,spot.feet+1)))continue;
  const p=world.spawnProjectile('crystal',spot.x,spot.feet-14,0,0);
  p.healingOwner=e.id;p.placed=true;p.planted=true;p.expiresAt=Infinity;
  world.M.Body.setStatic(p.body,true);
 }
 e.healingCount=world.projectiles.filter(p=>!p.dead&&p.healingOwner===e.id).length;
 e.healingActive=e.healingCount>0;
}
function echoRecovery(e,time){
 e.echoShieldActive=false;e.echoRecoveryUntil=time+2.4;e.echoPhaseUntil=e.echoRecoveryUntil;e.encounterPhase='recover';
}
// Before projectile damage deduplication. Return true when this contact was
// reflected (or is the same reflected body's stale contact within 150 ms).
export function reflectEncounterProjectile(world,e,p){
 if(e.skin!=='sift_echo_golem'||!e.alive||e.dead||e.frozen||p.dead||p.returning)return false;
 if(p.echoReflectedBy===e.id&&world.time-p.echoReflectedAt<.15)return true;
 if(!e.echoShieldActive||!['cobble','anvil','ender','slimeball','trident'].includes(p.ammo?.id))return false;
 const velocity=world.before?.get(p.body.id)||p.body.velocity,front=e.facing||-1;
 if(Math.hypot(velocity.x,velocity.y)*60<180||(p.body.position.x-e.body.position.x)*front<=0||velocity.x*front>=-.25)return false;
 world.M.Sleeping.set(p.body,false);
 world.M.Body.setPosition(p.body,{x:e.body.position.x+front*(e.dimensions.width/2+(p.ammo.size||28)/2+3),y:p.body.position.y});
 world.M.Body.setVelocity(p.body,{x:front*Math.max(3.2,Math.abs(velocity.x)*.85),y:velocity.y*.7-.4});
 p.echoReflectedBy=e.id;p.echoReflectedAt=world.time;
 echoRecovery(e,world.time);
 world.events.push({type:'echoReflect',x:e.body.position.x+front*e.dimensions.width/2,y:e.body.position.y,skin:e.skin});
 return true;
}
function pulse(world,e,radius,strength){
 const centre=e.body.position;
 for(const p of world.projectiles){
  if(p.dead||p.placed||p.body.isStatic)continue;
  const dx=p.body.position.x-centre.x,dy=p.body.position.y-centre.y,d=Math.hypot(dx,dy);
  if(d>radius||world.sample(p.body.position.x,p.body.bounds.max.y+3))continue;
  const power=(1-d/radius)*strength;
  world.M.Sleeping.set(p.body,false);
  world.M.Body.setVelocity(p.body,{x:p.body.velocity.x+(d>1?dx/d:-1)*power,y:p.body.velocity.y+(d>1?dy/d:0)*power-.35*power});
 }
 world.events.push({type:'encounterPulse',x:centre.x,y:centre.y,radius,skin:e.skin});
}
function flight(world,e,target,dt){
 const b=e.body,g=world.engine.gravity;
 // Counteract Matter gravity; position and collision response still belong to Matter.
 world.M.Body.applyForce(b,b.position,{x:-b.mass*g.x*g.scale,y:-b.mass*g.y*g.scale});
 const blend=Math.min(1,dt*4),dx=target.x-b.position.x,dy=target.y-b.position.y;
 world.M.Sleeping.set(b,false);
 world.M.Body.setVelocity(b,{x:b.velocity.x+(bound(dx*.025,-1.45,1.45)-b.velocity.x)*blend,y:b.velocity.y+(bound(dy*.025,-1.3,1.3)-b.velocity.y)*blend});
 if(Math.abs(b.velocity.x)>.05)e.facing=Math.sign(b.velocity.x);
 e.walkDistance+=(Math.abs(b.velocity.x)+.4)*dt*60;
}
/** Called once per live, unfrozen actor before normal patrol. Return true when
 * this hook owns movement. Uses only Matter Body/Sleeping, world.sample,
 * world.events, world.projectiles, world.time and world.engine.gravity.
 * Healing is limited to live, destructible owned crystals. No invulnerability. */
export function tickEncounter(world,e,dt){
 const profile=ENCOUNTER_PROFILES[e.skin];
 if(!profile||!e.alive||e.dead||e.frozen)return false;
 if(e.encounterStart===undefined)initEncounter(e,world.time);
 if(!profile.flying&&!profile.elite&&e.skin!=='sift_echo_golem')return false;
 const elapsed=world.time-e.encounterStart;
 if(e.skin==='wither'){
  e.encounterPhase='hover';e.pose={...e.pose,attackCharge:0,gesture:0,jawOpen:0,walkBlend:0,wingFlap:0};
  if(world.time<(e.externalUntil??0))return true;
  const f=e.flightBounds;
  flight(world,e,{x:e.encounterHome.x+Math.sin(elapsed*.65)*10,y:Math.min(e.encounterHome.y,f.bottom)-8+Math.sin(elapsed*.9)*5},dt);
  return true;
 }
 if(e.skin==='ender_dragon'){
  e.healingCount=world.projectiles.filter(p=>!p.dead&&p.healingOwner===e.id).length;
  e.healingActive=e.healingCount>0;
  e.hp=Math.min(profile.hp,e.hp+e.healingCount*6*dt);
  const perch=elapsed%11>=5.1;e.encounterPhase=perch?'perch':'patrol';
  e.pose={...e.pose,attackCharge:0,gesture:0,wingFlap:(Math.sin(elapsed*(perch?2:5))+1)/2,jawOpen:perch?.2:0,walkBlend:1};
  if(world.time<(e.externalUntil??0))return true;
  const f=e.flightBounds,cx=(f.left+f.right)/2,cy=(f.top+f.bottom)/2;
  const target=perch?{x:cx,y:f.bottom}:{x:cx+Math.sin(elapsed*.55)*(f.right-f.left)*.45,y:cy+Math.sin(elapsed*.8)*(f.bottom-f.top)*.23};
  flight(world,e,target,dt);return true;
 }
 if(e.skin==='sift_echo_golem'){
  if(world.time>=e.echoPhaseUntil){
   if(e.encounterPhase==='telegraph'){e.encounterPhase='shield';e.echoShieldActive=true;e.echoPhaseUntil=world.time+2.8;}
   else if(e.encounterPhase==='shield')echoRecovery(e,world.time);
   else{e.encounterPhase='telegraph';e.echoShieldActive=false;e.echoPhaseUntil=world.time+1.1;}
  }
  e.pose={...e.pose,attackCharge:e.encounterPhase==='telegraph'?bound(1-(e.echoPhaseUntil-world.time)/1.1,0,1):0,gesture:e.echoShieldActive?1:0,braceAmount:e.echoShieldActive?1:0,walkBlend:0};
  return true;
 }
 let cycle,length,charge,pulseAt,recoverEnd;
 length=6;charge=3.3;pulseAt=4.1;recoverEnd=5.4;
 cycle=Math.floor(elapsed/length);const t=elapsed%length;
 e.encounterPhase=t<charge?'patrol':t<pulseAt?'charge':t<pulseAt+.35?'pulse':t<recoverEnd?'recover':'patrol';
 const charging=e.encounterPhase==='charge',recovery=e.encounterPhase==='recover';
 e.pose={...e.pose,attackCharge:charging?(t-charge)/(pulseAt-charge):0,gesture:charging?1:recovery?.15:0,walkBlend:0};
 // Weapon impulses win over AI steering, so a well-placed shot stays physical.
 if(world.time<(e.externalUntil??0))return true;
 if(t>=pulseAt&&e.encounterPulseCycle!==cycle){
  e.encounterPulseCycle=cycle;
  // Long warning, short range, once per cycle; an ordinary hit is always valid.
  pulse(world,e,155,1.5);
 }
 // Singer alone retains the local song pulse, holding its physical pedestal.
 return true;
}
export function encounterDamageMultiplier(e,kind){
 // A clear recovery window rewards timing but never blocks an untimed hit.
 return ((e.skin==='ender_dragon'&&e.encounterPhase==='perch')||(e.skin==='sift_echo_golem'&&e.encounterPhase==='recover'))&&['cobble','anvil','trident','ender','slimeball'].includes(kind)?1.5:1;
}
// Called by combat once after every deduplicated effective Wither hit, including
// the killing hit. Damage ownership stays in combat; spawning never deals damage.
export function summonWitherSkeleton(world,e){
 const p=ENCOUNTER_PROFILES.wither_skeleton,s=world.s,half=p.width/2,origin=e.body.position,candidates=[];
 for(let gx=Math.ceil((half+3)/s);gx<Math.floor((world.width-half-3)/s);gx++)for(let gy=Math.ceil((p.height+3)/s);gy<world.grid.height-1;gy++){
  if(!world.grid.get(gx,gy)||world.grid.get(gx,gy-1))continue;
  const x=(gx+.5)*s,feet=gy*s;
  candidates.push({x,feet,distance:Math.hypot(x-origin.x,feet-origin.y)});
 }
 candidates.sort((a,b)=>a.distance-b.distance||a.x-b.x);
 for(const spot of candidates){
  const left=spot.x-half,right=spot.x+half,top=spot.feet-p.height,bottom=spot.feet;
  let clear=true;
  for(let x=left+1;x<right-1;x+=s)if(!world.sample(x,bottom+1)){clear=false;break;}
  if(!clear)continue;
  for(let y=top+1;y<bottom-1&&clear;y+=s)for(let x=left+1;x<right-1;x+=s)if(world.sample(x,y)){clear=false;break;}
  if(!clear)continue;
  for(const other of [...world.enemies,...(world.debris||[])]){
   if(other.dead)continue;const b=other.body.bounds;
   if(right>b.min.x-2&&left<b.max.x+2&&bottom>b.min.y-2&&top<b.max.y+2){clear=false;break;}
  }
  if(!clear)continue;
  const add=world.addEnemy(spot.x,spot.feet,'wither_skeleton');
  world.events.push({type:'summon',x:spot.x,y:spot.feet-p.height/2,sound:'wither_summon'});
  return add;
 }
 return null;
}
