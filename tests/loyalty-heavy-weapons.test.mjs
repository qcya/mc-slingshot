import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {PixelGrid} from '../src/pixels.mjs';
import {PROJECTILES,MATERIALS,TILE} from '../src/config.mjs';
import {gust} from '../src/combat.mjs';
import {predictArc} from '../src/aim.mjs';

const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const DT=1/120;
function world(width=768,height=320){return new SiegeWorld(M,{grid:new PixelGrid(width,height)});}
function advance(w,seconds){for(let i=0;i<Math.ceil(seconds/DT);i++)w.step(DT);}
function until(w,predicate,seconds=3){
 for(let i=0;i<Math.ceil(seconds/DT)&&!predicate();i++)w.step(DT);
 assert.ok(predicate(),'expected state was not reached within the simulated time');
}
function crystalOnGround(x=300){
 const w=world();w.grid.fill(0,128,w.grid.width,32,7);w.synchronize();
 const c=w.spawnProjectile('crystal',x,330,0,0);
 until(w,()=>c.placed,2);
 return {w,c};
}

test('loyalty automatically recalls a descending throw to its original launch point',()=>{
 const w=world(),origin={x:200,y:240};w.engine.gravity.y=0;
 const p=w.spawnProjectile('trident',origin.x,origin.y,850,0);
 until(w,()=>p.returning,1);
 assert.ok(p.age<1);assert.equal(p.body.isSensor,true);
 assert.deepEqual(p.returnHome,origin);
 until(w,()=>p.returned,1);
 assert.equal(p.dead,true);
 assert.equal(M.Composite.allBodies(w.engine.world).includes(p.body),false);
 const recalls=w.events.filter(e=>e.type==='recall');
 assert.equal(recalls.length,1);assert.equal(recalls[0].x,origin.x);assert.equal(recalls[0].y,origin.y);
});

test('loyalty has a bounded outbound lifetime even while still rising',()=>{
 const w=world();w.engine.gravity.y=0;
 const p=w.spawnProjectile('trident',200,400,500,-40);
 advance(w,1.2);assert.equal(p.returning,undefined);
 until(w,()=>p.returning,1);
 assert.ok(p.age<=1.5);
 until(w,()=>p.returned,2);
 assert.equal(p.dead,true);
});

test('a real terrain impact starts loyalty before its flight timer',()=>{
 const w=world();w.engine.gravity.y=0;w.grid.fill(120,0,16,200,7);w.synchronize();
 const p=w.spawnProjectile('trident',200,240,1000,-20);
 until(w,()=>p.returning,.25);
 assert.ok(p.age<.25,'terrain recalls a still-rising trident immediately');
 until(w,()=>p.returned,1);assert.equal(p.dead,true);
});

test('loyalty damages the same armored enemy once on each leg with distinct sources',()=>{
 const w=world();w.engine.gravity.y=0;
 const enemy=w.addEnemy(310,282,'hoglin',{stationary:true});M.Body.setStatic(enemy.body,true);
 const p=w.spawnProjectile('trident',200,240,900,0);
 until(w,()=>enemy.hp<300,.2);
 assert.equal(enemy.hp,200);
 assert.ok(enemy.hitSources.has(`ammo:${p.id}:outbound`));
 until(w,()=>p.returned,2);
 assert.equal(enemy.hp,100);assert.equal(enemy.alive,true);
 assert.deepEqual([...enemy.hitSources].sort(),[`ammo:${p.id}:outbound`,`ammo:${p.id}:return`].sort());
 advance(w,.5);assert.equal(enemy.hp,100);
});

test('loyalty hits on its return when a wall recalls it while it still overlaps the enemy',()=>{
 const w=world();w.engine.gravity.y=0;w.grid.fill(120,0,16,200,7);w.synchronize();
 const enemy=w.addEnemy(300,282,'hoglin',{stationary:true});M.Body.setStatic(enemy.body,true);
 const p=w.spawnProjectile('trident',200,240,900,0);
 until(w,()=>p.returned,1);
 assert.equal(enemy.hp,100,'turning around inside an existing sensor contact still starts a distinct return hit');
 assert.deepEqual([...enemy.hitSources].sort(),[`ammo:${p.id}:outbound`,`ammo:${p.id}:return`].sort());
});

test('loyalty crosses intervening terrain without damaging it and honors an explicit sling home',()=>{
 const w=world();w.engine.gravity.y=0;
 const home={x:100,y:240},p=w.spawnProjectile('trident',400,240,700,0,{returnHome:home});
 until(w,()=>p.returning,1);
 w.grid.fill(80,0,32,200,40);w.synchronize();
 const cells=w.grid.cells.slice(),hp=w.grid.hp.slice(),removed=w.stats.removed;
 until(w,()=>p.returned,1);
 assert.equal(p.dead,true);assert.deepEqual(p.returnHome,home);
 assert.deepEqual(w.grid.cells,cells);assert.deepEqual(w.grid.hp,hp);assert.equal(w.stats.removed,removed);
 assert.deepEqual(w.events.filter(e=>e.type==='recall').map(e=>({x:e.x,y:e.y})),[home]);
});

test('a trident thrown out of the playable side still recalls instead of being discarded',()=>{
 const w=world(512,288),home={x:285,y:545};
 const p=w.spawnProjectile('trident',420,545,-1430,0,{returnHome:home});
 advance(w,3);
 assert.equal(p.returned,true,'leaving the ordinary projectile cleanup bounds must not consume loyalty');
 assert.equal(p.dead,true);
 assert.equal(w.events.filter(e=>e.type==='recall').length,1);
});

test('the nearly block-wide anvil launches farther than an ordinary stone',()=>{
 const w=world();w.engine.gravity.y=0;
 const stone=w.spawnProjectile('cobble',200,200,600,-400),anvil=w.spawnProjectile('anvil',200,400,600,-400);
 assert.equal(anvil.ammo.size,42);assert.ok(anvil.ammo.size>=TILE*.85);
 advance(w,.1);
 assert.ok(anvil.body.position.x-200>(stone.body.position.x-200)*1.45);
});

test('a descending anvil converts its flight into a vertical plunge',()=>{
 const w=world(),p=w.spawnProjectile('anvil',250,200,650,-250);
 until(w,()=>p.plunging,1);
 const x=p.body.position.x;advance(w,.2);
 assert.ok(Math.abs(p.body.position.x-x)<.01);assert.equal(p.body.velocity.x,0);
 assert.ok(p.body.velocity.y>0);assert.equal(p.body.angle,0);
});

test('an anvil striking an obstacle while rising immediately begins its vertical plunge',()=>{
 const w=world();w.engine.gravity.y=0;w.grid.fill(134,0,16,200,40);w.synchronize();
 const p=w.spawnProjectile('anvil',300,280,700,-200);
 until(w,()=>p.plunging,.2);
 assert.ok(p.age<.12,'the obstacle triggers the plunge before a descent trigger is possible');
 advance(w,DT);const x=p.body.position.x;advance(w,.2);
 assert.ok(Math.abs(p.body.position.x-x)<.01);assert.equal(p.body.velocity.x,0);
});

test('an anvil cuts a full-width shaft through every ordinary material and remains planted on bedrock',()=>{
 const w=world(),cx=300,gx=cx/w.s,bedrockY=600;
 w.grid.fill(40,100,140,100,3);
 Object.keys(MATERIALS).map(Number).filter(m=>m!==7).forEach((m,i)=>w.grid.fill(40,100+i,140,1,m));
 w.grid.fill(40,200,140,8,7);w.grid.fill(40,208,140,12,40);w.synchronize();
 const neighbor=w.grid.get(gx-8,120),p=w.spawnProjectile('anvil',cx,180,0,350);
 until(w,()=>p.planted,3);
 assert.equal(p.body.isStatic,true);assert.equal(p.body.velocity.x,0);assert.equal(p.body.velocity.y,0);
 assert.ok(Math.abs(Math.max(...p.body.vertices.map(v=>v.y))-bedrockY)<.1);
 for(let y=100;y<200;y++)for(let x=gx-7;x<gx+7;x++)assert.equal(w.grid.get(x,y),0,`shaft pixel ${x},${y}`);
 assert.equal(w.grid.get(gx-8,120),neighbor,'terrain beside the 42px shaft survives');
 assert.equal(w.grid.get(gx,200),7);assert.equal(w.grid.get(gx,208),40);
 const position={...p.body.position};advance(w,21);
 assert.equal(p.dead,undefined);assert.equal(p.planted,true);assert.deepEqual(p.body.position,position);
 assert.ok(w.projectiles.includes(p));assert.ok(M.Composite.allBodies(w.engine.world).includes(p.body));
});

test('anvil preview dots follow actual boosted, capped, and plunging flight',()=>{
 for(const [vx,vy]of [[600,-400],[1430,-100],[-1000,100],[300,0],[1430,-1200]]){
  const w=world(1800,900),origin={x:1000,y:1000},dots=predictArc(w,'anvil',origin,vx,vy);
  const p=w.spawnProjectile('anvil',origin.x,origin.y,vx,vy);
  for(let step=1;step<=60;step++){
   w.step(DT);
   for(const dot of dots.filter(d=>d.step===step))assert.ok(Math.hypot(dot.x-p.body.position.x,dot.y-p.body.position.y)<.01,`preview diverged for ${vx},${vy} at step ${step}`);
  }
 }
});

test('a planted anvil stays harmless after wind while a creature contacts it',()=>{
 const w=world();w.grid.fill(0,200,w.grid.width,120,7);w.synchronize();
 const p=w.spawnProjectile('anvil',300,450,0,100);until(w,()=>p.planted,2);
 const position={...p.body.position};gust(w,250,p.body.position.y);
 assert.equal(p.body.speed,0);assert.equal(w.active(),false);
 const enemy=w.addEnemy(364,600,'hoglin',{stationary:true});enemy.externalUntil=w.time+1;
 M.Body.setVelocity(enemy.body,{x:-1,y:0});advance(w,1);
 assert.equal(enemy.hp,300);assert.equal(enemy.hitSources.size,0);
 assert.deepEqual(p.body.position,position);assert.equal(p.body.isStatic,true);
});

test('a crystal settles upright on real horizontal ground without a fuse',()=>{
 const {w,c}=crystalOnGround();advance(w,21);
 assert.equal(c.placed,true);assert.equal(c.body.isStatic,true);assert.equal(c.dead,undefined);
 assert.equal(w.stats.explosions,0);assert.ok(Math.abs(c.body.position.x-300)<.1);
});

test('a crystal contacting a vertical wall never treats the wall as a placement surface',()=>{
 const w=world();w.grid.fill(120,0,16,240,7);w.synchronize();
 const c=w.spawnProjectile('crystal',320,180,400,0);
 for(let i=0;i<120;i++){w.step(DT);assert.notEqual(c.placed,true);assert.equal(c.body.isStatic,false);}
 assert.ok(c.body.position.y>220,'the unplaced crystal continues falling beside the wall');
});

test('a small corner shelf without support under the crystal center cannot place it',()=>{
 const w=world();w.grid.fill(96,128,4,16,7);w.synchronize();
 const c=w.spawnProjectile('crystal',310,330,0,0);
 for(let i=0;i<160;i++){w.step(DT);assert.notEqual(c.placed,true);}
 assert.equal(c.body.isStatic,false);assert.equal(w.stats.explosions,0);
});

test('a crystal bridging two floor edges still requires support directly under its center',()=>{
 const w=world();w.grid.fill(80,128,40,16,7);w.grid.fill(99,128,2,16,0);w.synchronize();
 const c=w.spawnProjectile('crystal',300,330,0,0);
 for(let i=0;i<240;i++){w.step(DT);assert.notEqual(c.placed,true);}
 assert.equal(w.sample(300,385),0);assert.equal(w.sample(291,385),7);assert.equal(w.sample(309,385),7);
 assert.equal(c.body.isStatic,false);assert.equal(w.stats.explosions,0);
});

for(const ammo of PROJECTILES.filter(a=>a.id!=='crystal'))test(`a fast ${ammo.id} triggers a placed crystal through actual Matter contact`,()=>{
 const {w,c}=crystalOnGround();w.engine.gravity.y=0;
 w.spawnProjectile(ammo.id,220,c.body.position.y-12,900,-1);
 until(w,()=>c.dead,.2);
 assert.equal(w.stats.explosions,1);
});

test('a resting stone and a slow approaching stone cannot detonate a crystal',()=>{
 for(const speed of [0,100]){
  const {w,c}=crystalOnGround();w.engine.gravity.y=0;
  const stone=w.spawnProjectile('cobble',c.body.position.x-27,c.body.position.y-5,speed,0);
  advance(w,.4);
  assert.equal(c.dead,undefined);assert.equal(w.stats.explosions,0);
  assert.ok(stone.body.position.x<c.body.position.x);
 }
});

test('a wind burst detonates a crystal through a solid wall within its 125px radius',()=>{
 const {w,c}=crystalOnGround(390);
 w.grid.fill(105,100,8,28,7);w.synchronize();
 assert.equal(w.sample(325,c.body.position.y),7);
 gust(w,270,c.body.position.y);
 assert.equal(c.dead,true);assert.equal(w.stats.explosions,1);
});

test('a wind burst leaves an isolated crystal outside its radius intact',()=>{
 const {w,c}=crystalOnGround(420);
 gust(w,290,c.body.position.y);
 assert.equal(c.dead,undefined);assert.equal(w.stats.explosions,0);
 assert.equal(c.body.speed,0);assert.equal(c.body.isStatic,true);
});
