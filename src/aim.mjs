import {AMMO,clamp} from './config.mjs';
export function aimAngle(point,pivot){let a=Math.atan2(point.y-pivot.y,point.x-pivot.x);if(a>0)a-=Math.PI*2;return clamp(a,-3.65,-.35);}
// A disposable Matter body uses the same fixed step, gravity and air drag as play.
// Stop at the first solid obstruction and expose only the first half of that path.
export function predictArc(world,kind,origin,vx,vy){
 const M=world.M,ammo=AMMO.find(a=>a.id===kind),engine=M.Engine.create({gravity:{...world.engine.gravity}});
 const options={frictionAir:.0015},b=['cobble','tnt'].includes(kind)?M.Bodies.rectangle(origin.x,origin.y,ammo.size,ammo.size,options):M.Bodies.circle(origin.x,origin.y,ammo.size/2,options,16);
 M.Body.setMass(b,ammo.mass);M.Body.setVelocity(b,{x:vx/60,y:vy/60});M.Composite.add(engine.world,b);
 const solids=[...world.staticTiles.values(),...world.debris.filter(e=>!e.dead).map(e=>e.body)],points=[];
 for(let step=1;step<=300;step++){
  if(b.speed>26)M.Body.setVelocity(b,{x:b.velocity.x/b.speed*26,y:b.velocity.y/b.speed*26});
  M.Engine.update(engine,1000/120);points.push({x:b.position.x,y:b.position.y,time:step/120,step});
  if(b.position.x>world.width||b.position.y>world.height||M.Query.collides(b,solids).length)break;
 }
 M.Composite.clear(engine.world,false);M.Engine.clear(engine);
 return points.slice(0,Math.max(2,Math.floor(points.length/2))).filter((p,i)=>i%8===0);
}
