import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {PixelGrid} from '../src/pixels.mjs';
import {pullSling,SLING_HOME} from '../src/sling.mjs';
import {predictArc} from '../src/aim.mjs';
import {gust} from '../src/combat.mjs';
import {mobGeometry} from '../src/mobs.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js'),DT=1/120;
function fixture(){return new SiegeWorld(M,{grid:new PixelGrid(768,600)});}
function advance(w,t){for(let i=0;i<Math.ceil(t/DT);i++)w.step(DT);}
function until(w,f,t=5){for(let i=0;i<Math.ceil(t/DT)&&!f();i++)w.step(DT);assert.ok(f(),'the actual Matter event did not occur');}

test('audit: horizontal anvil contact hurts a surviving elite without teleporting onto its head',()=>{
 const w=fixture();w.engine.gravity.y=0;
 const e=w.addEnemy(500,600,'hoglin',{stationary:true}),p=w.spawnProjectile('anvil',350,558,900,0);
 until(w,()=>e.hp<300,1);
 assert.equal(e.hp,150);assert.notEqual(p.restingOnEnemy,e.id,'a side hit is not a falling head landing');
 assert.ok(Math.abs(p.body.position.y-558)<10,'a horizontal hit must not teleport the anvil above the target');
});

test('audit: an anvil rising into the underside of a surviving elite does not teleport to its head',()=>{
 const w=fixture();w.engine.gravity.y=0;
 const e=w.addEnemy(500,600,'hoglin',{stationary:true}),p=w.spawnProjectile('anvil',500,700,0,-800);
 until(w,()=>e.hp<300,1);
 assert.equal(e.hp,150);assert.notEqual(p.restingOnEnemy,e.id);
 assert.ok(p.body.position.y>e.body.position.y,'the upward shot is still below the target at contact');
});

test('audit: a downward anvil crushes one block of thick supported debris and stops above the remaining wood',()=>{
 const w=fixture();w.grid.fill(0,200,w.grid.width,400,7);w.synchronize();
 const debris=w.addDebris(new Uint8Array(80*20).fill(4),80,20,{x:180,y:540});advance(w,.5);
 const original=debris.count,p=w.spawnProjectile('anvil',300,400,0,350);
 until(w,()=>p.planted,5);
 const remaining=w.debris.filter(e=>!e.dead).reduce((n,e)=>n+e.count,0);
 assert.equal(original-remaining,256,'one 48 by 48 block of actual wood pixels is removed');
 assert.equal(w.stats.removed,256);assert.ok(w.events.some(e=>e.sound==='anvil_land'));
 assert.ok(p.body.bounds.max.y<600,'thick debris stops the anvil before bedrock');
});

test('audit: a falling anvil rests on a surviving head without freezing the target and drops after its death',()=>{
 const w=fixture();w.grid.fill(0,200,w.grid.width,400,7);w.synchronize();
 const e=w.addEnemy(500,600,'hoglin',{stationary:true}),p=w.spawnProjectile('anvil',500,380,0,500);
 until(w,()=>p.restingOnEnemy===e.id,3);
 assert.equal(e.body.isStatic,false);assert.equal(p.body.isStatic,true);assert.equal(p.body.isSensor,true);
 const y=p.body.position.y;w.hurt(e,e.hp);w.step(DT);
 assert.equal(p.body.isStatic,false);assert.equal(p.restingOnEnemy,null);
 until(w,()=>p.body.position.y>y+25,3);
});

test('audit: partial and full legal pulls keep aiming dots aligned with natural free flight',()=>{
 for(const pull of [.25,.5,.75,1])for(const angle of [.2,.6,1]){
  const w=fixture(),a=pullSling({x:SLING_HOME.x-135*pull*Math.cos(angle),y:SLING_HOME.y+135*pull*Math.sin(angle)});
  const dots=predictArc(w,'anvil',a.origin,a.vx,a.vy),p=w.spawnProjectile('anvil',a.origin.x,a.origin.y,a.vx,a.vy);
  for(let step=1;step<=60;step++){
   w.step(DT);
   for(const d of dots.filter(d=>d.step===step))assert.ok(Math.hypot(p.body.position.x-d.x,p.body.position.y-d.y)<.01);
   assert.notEqual(p.plunging,true);
  }
 }
});

test('audit: a rising side-wall contact cannot start drilling',()=>{
 const w=fixture();w.engine.gravity.y=0;w.grid.fill(134,0,16,200,3);w.synchronize();
 const p=w.spawnProjectile('anvil',300,400,900,-200);
 until(w,()=>w.contacts.some(pair=>pair.bodyA.parent.plugin.terrain||pair.bodyB.parent.plugin.terrain),1);
 assert.notEqual(p.plunging,true);assert.equal(w.stats.removed,0);
});

test('audit: layered terrain stops at the first protected surface or at the one-block impact budget',()=>{
 for(const thickness of [1,8,48]){
  const w=fixture();w.grid.fill(80,100,80,thickness,3);w.grid.fill(80,100+thickness,80,4,40);w.grid.fill(80,104+thickness,80,10,4);w.synchronize();
  const p=w.spawnProjectile('anvil',300,200,0,400);until(w,()=>p.planted,5);
  assert.ok(Math.abs(p.body.position.y+p.ammo.size/2-Math.min(348,(100+thickness)*3))<.1);
  if(thickness>16)assert.equal(w.grid.get(100,116),3,'touching deeper stone remains intact');
  assert.equal(w.grid.get(100,100+thickness),40);assert.equal(w.grid.get(100,104+thickness),4);
  until(w,()=>p.dead,2);
 }
});

test('audit: an anvil thrown into an empty void eventually leaves the simulation',()=>{
 const w=fixture(),p=w.spawnProjectile('anvil',300,300,100,100);
 until(w,()=>p.dead,6);
 assert.equal(w.projectiles.includes(p),false);assert.equal(w.active(),false);
});

test('audit: gust and blast cannot give a planted anvil phantom hit velocity against a new creature',()=>{
 const w=fixture();w.grid.fill(0,200,w.grid.width,400,7);w.synchronize();
 const p=w.spawnProjectile('anvil',300,450,0,200);until(w,()=>p.planted,3);
 const position={...p.body.position};gust(w,250,p.body.position.y);w.blast(250,p.body.position.y,10);
 assert.equal(p.body.mass,Infinity);assert.equal(p.body.speed,0);assert.deepEqual(p.body.position,position);
 const e=w.addEnemy(365,600,'hoglin',{stationary:true});e.externalUntil=w.time+1;
 M.Body.setVelocity(e.body,{x:-1.6,y:0});
 let contacted=false;
 for(let i=0;i<24;i++){
  w.step(DT);contacted||=w.contacts.some(pair=>[pair.bodyA.parent,pair.bodyB.parent].includes(p.body)&&[pair.bodyA.parent,pair.bodyB.parent].includes(e.body));
 }
 assert.equal(contacted,true);assert.equal(e.hp,300);assert.equal(p.body.speed,0);
});

test('audit: a head-resting anvil follows the Shulker visible lid when it opens',()=>{
 const w=fixture();w.grid.fill(0,200,w.grid.width,400,7);w.synchronize();
 const e=w.addEnemy(500,600,'shulker'),p=w.spawnProjectile('anvil',500,430,0,450);
 until(w,()=>p.restingOnEnemy===e.id,2);
 until(w,()=>e.shellAmount>.8,5);assert.equal(p.dead,undefined);
 const visualTop=amount=>2.7*Math.min(...mobGeometry(e.skin,e.walkDistance/14,e.facing,{...e.pose,openAmount:amount}).filter(f=>f.part==='shellLid').flatMap(f=>f.vertices.map(v=>v.y)));
 const expected=e.body.position.y-e.dimensions.height/2+visualTop(e.shellAmount)-visualTop(0);
 assert.ok(Math.abs(p.body.position.y+p.ammo.size/2-expected)<.1,'the anvil must rise by the same amount as the rendered lid');
});

test('audit: an anvil leaving a drilled roof accelerates through air and resumes drilling at the next platform',()=>{
 const w=fixture();w.grid.fill(80,100,80,8,3);w.grid.fill(80,160,80,12,4);w.grid.fill(0,200,w.grid.width,400,7);w.synchronize();
 const p=w.spawnProjectile('anvil',300,200,0,400);until(w,()=>p.plunging,2);
 until(w,()=>p.body.position.y>365,2);
 assert.notEqual(p.plunging,true,'drilling is limited to actual material contact');
 const speed=p.body.velocity.y;advance(w,.1);
 assert.ok(p.body.velocity.y>speed+.3,'gravity accelerates the airborne anvil instead of imposing drill speed');
 until(w,()=>p.plunging&&p.body.position.y>430,2);
 w.step(DT);
 assert.ok(w.grid.get(100,160)===0,'the lower platform begins drilling on its own actual contact');
});

test('audit: first-hit Enderman teleport does not carry the impacting anvil to the destination head',()=>{
 const w=fixture();w.grid.fill(0,200,w.grid.width,400,7);w.synchronize();
 const e=w.addEnemy(500,600,'enderman',{stationary:true,teleportSpots:[{x:900,feet:600},{x:1100,feet:600},{x:1300,feet:600}]}),p=w.spawnProjectile('anvil',500,350,0,400);
 until(w,()=>e.teleportCount===1,2);
 assert.equal(e.alive,true);assert.equal(e.hp,100);assert.notEqual(p.restingOnEnemy,e.id);
 assert.ok(Math.abs(p.body.position.x-e.body.position.x)>100);
 assert.ok(Math.abs(p.body.position.x-500)<5,'the physical anvil remains at its original impact');
});

test('audit: an Enderman teleporting straight downward cannot take the anvil to its new lower head',()=>{
 const w=fixture();w.grid.fill(150,200,40,1,3);w.grid.fill(0,300,w.grid.width,300,7);w.synchronize();
 const e=w.addEnemy(500,600,'enderman',{stationary:true,teleportSpots:[{x:500,feet:900},{x:900,feet:900},{x:1100,feet:900}]});
 e.combatSeed=1972;
 const p=w.spawnProjectile('anvil',500,350,0,400);until(w,()=>e.teleportCount===1,2);
 assert.equal(e.body.position.x,500);assert.ok(e.body.position.y>800,'fixture chooses a real lower supported teleport');
 assert.equal(e.hp,100);assert.notEqual(p.restingOnEnemy,e.id);
 assert.ok(p.body.position.y<600,'the anvil stays at the original top contact');
});
