// Sift species/geometry come from Mielon's MIT-licensed community mod.
// Their encounter roles and all boss phases below are adaptations for this game.
export const ENCOUNTER_PROFILES={
 wither:{width:112,height:88,mass:5,hp:450,armored:true,heavy:true,fireImmune:true,flying:true,boss:true,label:'凋灵'},
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
 if(profile.flying){
  e.flying=true;
  // Bounds describe the body's centre. Authored maps leave the entire box clear.
  e.flightBounds={left:e.body.position.x-110,right:e.body.position.x+110,top:Math.max(120,e.body.position.y-230),bottom:e.body.position.y,...options.flightBounds};
 }
 if(profile.elite||e.skin==='sift_echo_golem')e.stationary=true;
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
 * No invisible projectiles, terrain damage, healing or invulnerability. */
export function tickEncounter(world,e,dt){
 const profile=ENCOUNTER_PROFILES[e.skin];
 if(!profile||!e.alive||e.dead||e.frozen)return false;
 if(e.encounterStart===undefined)initEncounter(e,world.time);
 if(!profile.flying&&!profile.elite&&e.skin!=='sift_echo_golem')return false;
 const elapsed=world.time-e.encounterStart;
 let cycle,length,charge,pulseAt,recoverEnd;
 if(e.skin==='wither'){length=8;charge=3.3;pulseAt=4.1;recoverEnd=6.2;}
 else if(e.skin==='ender_dragon'){length=11;charge=5.1;pulseAt=6;recoverEnd=9.1;}
 else if(e.skin==='sift_singer'){length=6;charge=3.3;pulseAt=4.1;recoverEnd=5.4;}
 else{length=7.5;charge=3.8;pulseAt=4.8;recoverEnd=6.4;}
 cycle=Math.floor(elapsed/length);const t=elapsed%length;
 e.encounterPhase=t<charge?'patrol':t<pulseAt?'charge':t<pulseAt+.35?'pulse':t<recoverEnd?'recover':'patrol';
 const charging=e.encounterPhase==='charge',recovery=e.encounterPhase==='recover';
 e.pose={...e.pose,attackCharge:charging?(t-charge)/(pulseAt-charge):0,gesture:charging?1:recovery?.15:0,braceAmount:e.skin==='sift_echo_golem'&&charging?1:0,
  wingFlap:(Math.sin(elapsed*(recovery?2:5))+1)/2,jawOpen:charging||e.encounterPhase==='pulse'?1:0,walkBlend:profile.flying?1:0};
 // Weapon impulses win over AI steering, so a well-placed shot stays physical.
 if(world.time<(e.externalUntil??0))return true;
 if(t>=pulseAt&&e.encounterPulseCycle!==cycle){
  e.encounterPulseCycle=cycle;
  // Long warning, short range, once per cycle; an ordinary hit is always valid.
  pulse(world,e,e.skin==='sift_singer'?155:e.skin==='sift_echo_golem'?190:180,e.skin==='sift_singer'?1.5:2.2);
 }
 if(profile.flying){
  const f=e.flightBounds,cx=(f.left+f.right)/2,cy=(f.top+f.bottom)/2;
  let target={x:cx+Math.sin(elapsed*.55)*(f.right-f.left)*.45,y:cy+Math.sin(elapsed*.8)*(f.bottom-f.top)*.23};
  // The dragon descends to a long, predictable perch window for heavy shots.
  if(e.skin==='ender_dragon'&&(charging||recovery||e.encounterPhase==='pulse'))target={x:cx,y:f.bottom};
  else if(e.skin==='wither'&&(charging||recovery))target={x:cx,y:cy};
  flight(world,e,target,dt);return true;
 }
 // Hold the authored pedestal without replacing physics or this phase's pose.
 return true;
}
export function encounterDamageMultiplier(e,kind){
 // A clear recovery window rewards timing but never blocks an untimed hit.
 return ENCOUNTER_PROFILES[e.skin]?.boss&&e.encounterPhase==='recover'&&['cobble','anvil','trident','ender','slimeball'].includes(kind)?1.5:1;
}
