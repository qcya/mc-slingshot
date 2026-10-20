import {AMMO} from './config.mjs';
import {projectileBody,projectileGravity} from './combat.mjs';
export function aimAngle(point,pivot){return Math.atan2(point.y-pivot.y,point.x-pivot.x);}
export function arcRevision(world){return String(world.grid.version);}
// Five nearby samples, covering at most 0.5 seconds of free flight.
export function predictArc(world,kind,origin,vx,vy){
 const M=world.M,ammo=AMMO.find(a=>a.id===kind),engine=M.Engine.create({gravity:{...world.engine.gravity}});
 const options={frictionAir:.0015},b=projectileBody(M,ammo,origin.x,origin.y,options);
 M.Body.setMass(b,ammo.mass);M.Body.setVelocity(b,{x:vx/60,y:vy/60});M.Composite.add(engine.world,b);
 const samples=[];
 for(let step=1;step<=60;step++){
  if(b.speed>26)M.Body.setVelocity(b,{x:b.velocity.x/b.speed*26,y:b.velocity.y/b.speed*26});
  projectileGravity(M,b,ammo,engine.gravity);
  M.Engine.update(engine,1000/120);
  if(b.position.x<6||b.position.x>world.width-6||b.position.y<6||b.position.y>world.height-6)break;
  samples.push({x:b.position.x,y:b.position.y,time:step/120,step});
 }
 M.Composite.clear(engine.world,false);M.Engine.clear(engine);
 // The pouch is always inside the playable area; at least one step is available.
 return Array.from({length:5},(_,i)=>samples[Math.max(0,Math.ceil((i+1)*samples.length/5)-1)]??{...origin,time:0,step:0});
}
