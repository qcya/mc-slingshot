import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {PixelGrid} from '../src/pixels.mjs';
import {PROJECTILES,MATERIALS,TILE} from '../src/config.mjs';
import {gust,projectileOpacity} from '../src/combat.mjs';
import {predictArc} from '../src/aim.mjs';
import {updateOutcome} from '../src/outcome.mjs';

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

// beta1: loyalty waits for a real stop or a viewport exit, never an apex or fuse.
test('a moving trident remains outbound for several seconds without a timer recall',()=>{
 const w=world(1536,600);w.engine.gravity.y=0;
 const p=w.spawnProjectile('trident',200,400,200,-20);
 advance(w,4);
 assert.ok(p.body.speed*60>45);assert.equal(p.dead,undefined);assert.notEqual(p.returning,true);
 assert.ok(p.body.position.x>700);
});

test('a trident continues its natural arc through the apex and descent',()=>{
 const w=world(1536,1200),p=w.spawnProjectile('trident',300,300,300,-180);
 advance(w,.8);
 assert.ok(p.body.velocity.y>0);assert.ok(p.body.position.x>450);
 assert.notEqual(p.returning,true);assert.equal(p.dead,undefined);
 advance(w,1);
 assert.notEqual(p.returning,true);assert.equal(p.dead,undefined);
});

test('a moving trident can graze terrain without recalling on the contact itself',()=>{
 const w=world();w.engine.gravity.y=0;w.grid.fill(0,128,w.grid.width,32,7);w.synchronize();
 const p=w.spawnProjectile('trident',200,371,900,0);w.step(DT);
 assert.ok(w.contacts.some(pair=>pair.bodyA.parent.plugin.terrain||pair.bodyB.parent.plugin.terrain));
 assert.ok(p.body.speed*60>45);assert.notEqual(p.returning,true);
 advance(w,.04);assert.notEqual(p.returning,true);
});

test('a trident that actually stops against bedrock recalls to its launch origin',()=>{
 const w=world();w.grid.fill(120,0,16,200,7);w.grid.fill(0,94,w.grid.width,32,7);w.synchronize();
 const origin={x:200,y:240},p=w.spawnProjectile('trident',origin.x,origin.y,900,0);
 until(w,()=>p.returning,4);assert.equal(p.body.isSensor,true);assert.deepEqual(p.returnHome,origin);
 until(w,()=>p.returned,2);assert.equal(p.dead,true);
 assert.equal(M.Composite.allBodies(w.engine.world).includes(p.body),false);
 assert.deepEqual(w.events.filter(e=>e.type==='recall').map(e=>({x:e.x,y:e.y})),[origin]);
});

test('loyalty damages the same armored enemy once on each leg with distinct sources',()=>{
 const w=world();w.grid.fill(200,0,16,200,7);w.grid.fill(0,94,w.grid.width,32,7);w.synchronize();
 const enemy=w.addEnemy(310,282,'hoglin',{stationary:true});M.Body.setStatic(enemy.body,true);
 const p=w.spawnProjectile('trident',200,240,900,0);
 until(w,()=>enemy.hp<300,.2);assert.equal(enemy.hp,200);
 assert.ok(enemy.hitSources.has(`ammo:${p.id}:outbound`));
 until(w,()=>p.returned,4);assert.equal(enemy.hp,100);assert.equal(enemy.alive,true);
 assert.deepEqual([...enemy.hitSources].sort(),[`ammo:${p.id}:outbound`,`ammo:${p.id}:return`].sort());
 advance(w,.5);assert.equal(enemy.hp,100);
});

test('loyalty hits on its return after stopping while still overlapping an enemy',()=>{
 const w=world();w.grid.fill(120,0,16,200,7);w.grid.fill(0,94,w.grid.width,32,7);w.synchronize();
 const enemy=w.addEnemy(300,282,'hoglin',{stationary:true});M.Body.setStatic(enemy.body,true);
 const p=w.spawnProjectile('trident',200,240,900,0);
 until(w,()=>p.returned,4);
 assert.equal(enemy.hp,100);
 assert.deepEqual([...enemy.hitSources].sort(),[`ammo:${p.id}:outbound`,`ammo:${p.id}:return`].sort());
});

test('loyalty crosses intervening terrain without damaging it and honors an explicit sling home',()=>{
 const w=world(512,288);w.engine.gravity.y=0;
 const home={x:100,y:240},p=w.spawnProjectile('trident',400,240,700,0,{returnHome:home});
 until(w,()=>p.returning,3);
 w.grid.fill(80,0,32,200,40);w.synchronize();
 const cells=w.grid.cells.slice(),hp=w.grid.hp.slice(),removed=w.stats.removed;
 until(w,()=>p.returned,2);
 assert.equal(p.dead,true);assert.deepEqual(p.returnHome,home);
 assert.deepEqual(w.grid.cells,cells);assert.deepEqual(w.grid.hp,hp);assert.equal(w.stats.removed,removed);
 assert.deepEqual(w.events.filter(e=>e.type==='recall').map(e=>({x:e.x,y:e.y})),[home]);
});

test('a trident thrown out of the playable side still recalls instead of being discarded',()=>{
 const w=world(512,288),home={x:285,y:545};
 const p=w.spawnProjectile('trident',420,545,-1430,0,{returnHome:home});advance(w,3);
 assert.equal(p.returned,true);assert.equal(p.dead,true);
 assert.equal(w.events.filter(e=>e.type==='recall').length,1);
});

test('the nearly block-wide anvil launches a shorter distance than an ordinary stone',()=>{
 const w=world();w.engine.gravity.y=0;
 const stone=w.spawnProjectile('cobble',200,200,600,-400),anvil=w.spawnProjectile('anvil',200,400,600,-400);
 assert.equal(anvil.ammo.size,42);assert.ok(anvil.ammo.size>=TILE*.85);advance(w,.1);
 assert.ok(anvil.body.position.x-200<stone.body.position.x-200);
});

test('a full-strength anvil stays within the horizontal viewport throughout a natural throw',()=>{
 const w=world(512,1200),p=w.spawnProjectile('anvil',160,545,1430,-1100);
 for(let i=0;i<480&&!p.dead;i++){
  w.step(DT);assert.ok(p.body.position.x>=p.ammo.size/2&&p.body.position.x<=w.width-p.ammo.size/2);
 }
});

test('an anvil keeps natural horizontal flight after its apex until a real ground contact',()=>{
 const w=world(1536,1200),p=w.spawnProjectile('anvil',250,200,650,-250);
 advance(w,.8);assert.ok(p.body.velocity.y>0);assert.notEqual(p.plunging,true);
 const x=p.body.position.x;advance(w,.2);assert.ok(p.body.position.x>x+10);assert.notEqual(p.plunging,true);
});

test('an anvil striking a side obstacle while rising does not start a downward drill',()=>{
 const w=world();w.engine.gravity.y=0;w.grid.fill(134,0,16,200,7);w.synchronize();
 const p=w.spawnProjectile('anvil',300,280,700,-200);
 until(w,()=>w.contacts.some(pair=>pair.bodyA.parent.plugin.terrain||pair.bodyB.parent.plugin.terrain),.8);
 assert.notEqual(p.plunging,true);
});

test('an anvil drills progressively with repeated clinks, preserves the shaft sides, and fades at bedrock',()=>{
 const w=world(),cx=300,gx=cx/w.s,bedrockY=600;
 w.grid.fill(40,100,140,100,3);
 Object.keys(MATERIALS).map(Number).filter(m=>m!==7).forEach((m,i)=>w.grid.fill(40,100+i,140,1,m));
 w.grid.fill(40,200,140,8,7);w.grid.fill(40,208,140,12,40);w.synchronize();
 const neighbor=w.grid.get(gx-8,120),p=w.spawnProjectile('anvil',cx,180,0,350);
 until(w,()=>p.plunging,3);advance(w,.35);
 assert.ok(w.stats.removed>0);assert.notEqual(p.planted,true,'a deep shaft cannot be cleared in one instant');
 assert.notEqual(w.grid.get(gx,195),0,'deep material remains until the anvil reaches it');
 until(w,()=>p.planted,6);
 assert.ok(Math.abs(Math.max(...p.body.vertices.map(v=>v.y))-bedrockY)<.1);
 for(let y=100;y<200;y++)for(let x=gx-7;x<gx+7;x++)assert.equal(w.grid.get(x,y),0,`shaft pixel ${x},${y}`);
 assert.equal(w.grid.get(gx-8,120),neighbor);assert.equal(w.grid.get(gx,200),7);assert.equal(w.grid.get(gx,208),40);
 assert.ok(w.events.filter(e=>e.sound==='anvil_land').length>=3,'each section of drilling produces another clink');
 until(w,()=>p.dead||projectileOpacity(p,w.time)<.99,2);
 assert.notEqual(p.dead,true,'the bedrock stop visibly fades before disappearing');
 assert.ok(projectileOpacity(p,w.time)>0&&projectileOpacity(p,w.time)<1);
 until(w,()=>p.dead,3);
 assert.equal(w.projectiles.includes(p),false);assert.equal(M.Composite.allBodies(w.engine.world).includes(p.body),false);
});

test('anvil preview dots follow actual short-range natural flight',()=>{
 for(const [vx,vy]of [[600,-400],[1430,-100],[-1000,100],[300,0],[1430,-1200]]){
  const w=world(1800,900),origin={x:1000,y:1000},dots=predictArc(w,'anvil',origin,vx,vy);
  const p=w.spawnProjectile('anvil',origin.x,origin.y,vx,vy);
  for(let step=1;step<=60;step++){
   w.step(DT);
   for(const dot of dots.filter(d=>d.step===step))assert.ok(Math.hypot(dot.x-p.body.position.x,dot.y-p.body.position.y)<.01,`preview diverged for ${vx},${vy} at step ${step}`);
  }
 }
});

test('an anvil pauses on a surviving elite head without pinning it, follows it, then fades',()=>{
 const w=world();w.grid.fill(0,200,w.grid.width,120,7);w.synchronize();
 const enemy=w.addEnemy(500,600,'hoglin',{stationary:true}),p=w.spawnProjectile('anvil',500,380,0,500);
 until(w,()=>p.restingOnEnemy===enemy.id,3);
 assert.equal(enemy.alive,true);assert.equal(enemy.body.isStatic,false);assert.equal(enemy.hp,150);
 const beforeX=enemy.body.position.x;
 enemy.stationary=false;enemy.behavior='walk';enemy.actionUntil=w.time+4;enemy.facing=1;
 advance(w,1);
 assert.ok(Math.abs(enemy.body.position.x-beforeX)>5,'the surviving elite can still walk with the anvil on its head');
 assert.ok(Math.abs(p.body.position.x-enemy.body.position.x)<5);assert.equal(p.dead,undefined);
 advance(w,2);assert.equal(p.dead,undefined,'the head pause remains visible for several seconds');
 until(w,()=>p.dead,5);assert.equal(enemy.alive,true);assert.equal(enemy.body.isStatic,false);
});

test('an anvil that kills an ordinary mob continues falling instead of resting on its corpse',()=>{
 const w=world(768,600);w.engine.gravity.y=0;
 const enemy=w.addEnemy(500,450,'zombie',{stationary:true});
 const p=w.spawnProjectile('anvil',500,270,0,500);
 until(w,()=>!enemy.alive,2);assert.notEqual(p.restingOnEnemy,enemy.id);
 const y=p.body.position.y;advance(w,.4);
 assert.ok(p.body.position.y>y+50);assert.notEqual(p.plunging,true);
});

test('a drilling anvil pauses on a live creature below the shaft and resumes after that creature dies',()=>{
 const w=world();w.grid.fill(80,100,60,10,3);w.grid.fill(0,200,w.grid.width,120,7);w.synchronize();
 const enemy=w.addEnemy(300,600,'hoglin',{stationary:true}),p=w.spawnProjectile('anvil',300,200,0,400);
 until(w,()=>p.plunging,2);
 until(w,()=>p.restingOnEnemy===enemy.id,4);
 assert.equal(enemy.hp,150);assert.equal(enemy.body.isStatic,false);assert.equal(p.body.isSensor,true);
 const headY=p.body.position.y;w.hurt(enemy,150);w.step(DT);
 assert.equal(p.restingOnEnemy,null);assert.equal(p.body.isStatic,false);assert.equal(p.expiresAt,Infinity);
 until(w,()=>p.body.position.y>headY+30,3);
 until(w,()=>p.dead,4);
});

test('the loss timer waits for a resting anvil to finish fading',()=>{
 const w=world();w.grid.fill(0,200,w.grid.width,120,7);w.synchronize();
 const enemy=w.addEnemy(500,600,'hoglin',{stationary:true}),p=w.spawnProjectile('anvil',500,380,0,500);
 until(w,()=>p.restingOnEnemy===enemy.id,3);
 const state={shots:0,launch:null,quiet:0,winWait:0};
 for(let i=0;i<480;i++){
  w.step(DT);assert.equal(updateOutcome(state,w,DT),null);
 }
 assert.equal(p.dead,undefined);assert.equal(state.quiet,0);
 until(w,()=>p.dead,3);
 let outcome=null;
 for(let i=0;i<360&&outcome===null;i++){w.step(DT);outcome=updateOutcome(state,w,DT);}
 assert.equal(outcome,false);
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
