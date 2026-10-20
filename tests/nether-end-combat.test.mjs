import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';
import {SiegeWorld} from '../src/world.mjs';
import {AMMO} from '../src/config.mjs';
import {mobGeometry} from '../src/mobs.mjs';
import {teleportSpotValid} from '../src/combat.mjs';
import {burnEnemy,splashWater} from '../src/fire.mjs';
import {predictArc} from '../src/aim.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function fixture(options={}){const grid=new PixelGrid(512,288);grid.fill(0,240,512,48,7);return new SiegeWorld(M,{grid,...options});}
function step(w,t){for(let i=0;i<t*120;i++)w.step(1/120);}
function hit(w,p,e){w.before=new Map([[p.body.id,{x:6,y:0,omega:0}],[e.body.id,{x:0,y:0,omega:0}]]);w.processContact({bodyA:p.body,bodyB:e.body,collision:{normal:{x:1,y:0},supports:[{x:e.body.position.x,y:e.body.position.y}]}});w.time+=.2;}
test('Hoglin shares Warden armor and requires three distinct stones',()=>{const w=fixture(),e=w.addEnemy(600,720,'hoglin');assert.equal(e.hp,300);const p=w.spawnProjectile('cobble',500,600,0,0);hit(w,p,e);hit(w,p,e);assert.equal(e.hp,200);hit(w,w.spawnProjectile('cobble',500,600,0,0),e);assert.equal(e.hp,100);hit(w,w.spawnProjectile('cobble',500,600,0,0),e);assert.equal(e.alive,false);});
test('closed Shulker takes three distinct stones, visibly open Shulker one',()=>{const w=fixture(),e=w.addEnemy(600,720,'shulker');const p=w.spawnProjectile('cobble',500,600,0,0);hit(w,p,e);hit(w,p,e);assert.equal(e.hp,200);hit(w,w.spawnProjectile('cobble',500,600,0,0),e);assert.equal(e.hp,100);hit(w,w.spawnProjectile('cobble',500,600,0,0),e);assert.equal(e.alive,false);const open=w.addEnemy(800,720,'shulker');for(let i=0;i<1200&&open.shellAmount<.5;i++)w.step(1/120);assert.ok(open.pose.openAmount>=.5);hit(w,w.spawnProjectile('cobble',700,600,0,0),open);assert.equal(open.alive,false);});
test('Shulker cycles different closed and open durations with visible lid motion',()=>{const w=fixture(),e=w.addEnemy(600,720,'shulker');const states=new Set(),durations=[];let last=e.shellOpen;for(let i=0;i<2200;i++){w.step(1/120);states.add(e.shellOpen);if(e.shellOpen!==last){durations.push(e.shellUntil-w.time);last=e.shellOpen;}}assert.equal(states.size,2);assert.ok(new Set(durations.map(n=>n.toFixed(2))).size>2);assert.ok(e.pose.openAmount>=0&&e.pose.openAmount<=1);});
test('Enderman teleports once to a supported in-bounds spot and ignores repeat projectile contact',()=>{const w=fixture(),spots=[{x:400,feet:720},{x:700,feet:720},{x:1000,feet:720},{x:1300,feet:720}],e=w.addEnemy(400,720,'enderman',{teleportSpots:spots});const p=w.spawnProjectile('cobble',350,600,0,0);hit(w,p,e);assert.equal(e.alive,true);assert.equal(e.teleportCount,1);assert.notEqual(e.body.position.x,400);assert.ok(spots.some(s=>s.x===e.body.position.x));const hp=e.hp;hit(w,p,e);assert.equal(e.hp,hp);assert.equal(e.teleportCount,1);hit(w,w.spawnProjectile('cobble',350,600,0,0),e);assert.equal(e.alive,false);});
test('five extra inventory items have distinct safe utility and heavy damage behavior',()=>{assert.equal(AMMO.length,9);const w=fixture(),e=w.addEnemy(600,720,'hoglin');hit(w,w.spawnProjectile('snowball',500,600,0,0),e);assert.equal(e.hp,300);assert.ok(e.slowUntil>w.time);hit(w,w.spawnProjectile('wind',500,600,0,0),e);assert.equal(e.hp,300);assert.ok(e.externalUntil>w.time);const slime=w.spawnProjectile('slimeball',500,600,0,0);assert.ok(slime.body.restitution>.7);hit(w,w.spawnProjectile('anvil',500,600,0,0),e);assert.equal(e.hp,150);});
test('water cancels remaining burn damage',()=>{const w=fixture(),e=w.addEnemy(600,720,'hoglin');hit(w,w.spawnProjectile('fire',500,600,0,0),e);assert.equal(e.burnTicks.length,3);hit(w,w.spawnProjectile('water',500,600,0,0),e);assert.equal(e.burnTicks.length,0);assert.equal(e.burningUntil,0);step(w,2);assert.equal(e.hp,300);});
test('lava stays behind a solid dam then moves downward through a broken opening',()=>{const w=fixture({lavaSources:[{x:12,y:5}]});w.grid.fill(10*16,6*16,5*16,16,3);step(w,2);assert.ok(w.lava);assert.ok([...w.lava.cells.values()].every(c=>c.y<6*48));w.grid.fill(12*16,6*16,16,16,0);step(w,2);assert.ok([...w.lava.cells.values()].some(c=>c.y>=7*48));assert.ok(w.lava.cells.size<=4096);});
test('new mob geometry has separate real body parts instead of humanoid atlas reuse',()=>{for(const [skin,parts] of [['zombified_piglin',['snout','leftEar','rightEar']],['hoglin',['frontLeftLeg','backLeftLeg','leftTusk']],['shulker',['shellBase','shellLid','head']],['enderman',['leftArm','rightLeg','head']]]){const geometry=mobGeometry(skin,1.2,1,{openAmount:.8});for(const part of parts)assert.ok(geometry.some(f=>f.part===part),`${skin}:${part}`);}});

test('zombified piglin is immune to flame charges and flowing lava but still takes stone damage',()=>{
 const w=fixture({lavaSources:[{x:12,y:14}]}),e=w.addEnemy(600,720,'zombified_piglin',{stationary:true});
 assert.equal(burnEnemy(w,e,'fire:1'),false);assert.equal(e.burnTicks.length,0);
 step(w,3);assert.equal(e.hp,100);assert.equal(e.burningUntil,0);assert.ok(w.lava.cells.size>0);
 hit(w,w.spawnProjectile('cobble',500,600,0,0),e);assert.equal(e.alive,false);
});

test('Enderman teleport checks reject other creatures, nonfinite spots and edge pixels',()=>{
 const w=fixture(),e=w.addEnemy(400,720,'enderman'),spot={x:700,feet:720};
 assert.equal(teleportSpotValid(w,e,spot),true);
 const other=w.addEnemy(700,720);assert.equal(teleportSpotValid(w,e,spot),false);w.remove(other);
 assert.equal(teleportSpotValid(w,e,{x:NaN,feet:720}),false);
 w.grid.set(228,196,3);assert.equal(teleportSpotValid(w,e,spot),false);
});

test('water turns contacted lava into blocking obsidian and extinguishes surface fire',()=>{
 const w=fixture({lavaSources:[{x:12,y:5}]});step(w,1);
 const cell=[...w.lava.cells.values()][0],x=cell.x+cell.size/2,y=cell.y+cell.size/2;
 w.fires.push({x:x-24,y:y-24,size:48});splashWater(w,x,y,20);
 assert.equal(w.grid.get(cell.gx*4,cell.gy*4),40);assert.equal(w.lava.cells.has(`${cell.gx}:${cell.gy}`),false);assert.equal(w.fires.length,0);
 step(w,.5);assert.equal(w.lava.cells.has(`${cell.gx}:${cell.gy}`),false);
});

test('anvil falls more steeply than stone and its aim dots follow actual flight',()=>{
 const w=fixture(),origin={x:100,y:100},stone=w.spawnProjectile('cobble',100,100,400,0),anvil=w.spawnProjectile('anvil',100,100,400,0),arc=predictArc(w,'anvil',origin,400,0);
 w.M.Body.setPosition(stone.body,{x:100,y:300});step(w,.5);
 assert.ok(anvil.body.position.y-100>stone.body.position.y-300+15);
 assert.ok(Math.abs(anvil.body.position.x-arc[4].x)<.01);assert.ok(Math.abs(anvil.body.position.y-arc[4].y)<.01);
});

test('snowball slows actual patrol for four seconds and movement recovers after it expires',()=>{
 const normal=fixture(),slowed=fixture(),a=normal.addEnemy(600,720),b=slowed.addEnemy(600,720);
 step(normal,.3);step(slowed,.3);hit(slowed,slowed.spawnProjectile('snowball',500,600,0,0),b);
 // Contact helper advances its clock; keep behavior timers synchronized.
 normal.time=slowed.time;const ax=a.body.position.x,bx=b.body.position.x;
 step(normal,1);step(slowed,1);
 const slowDistance=Math.abs(b.body.position.x-bx);
 assert.ok(slowDistance<Math.abs(a.body.position.x-ax)*.5);
 assert.ok(slowDistance<1);assert.equal(b.hp,100);
 step(slowed,4);b.behavior='walk';b.actionUntil=slowed.time+2;const resumedX=b.body.position.x;step(slowed,1);
 assert.ok(Math.abs(b.body.position.x-resumedX)>slowDistance*2);
});

test('Hoglin survives one real TNT launch and landing, then dies to a second blast',()=>{
 const w=fixture(),e=w.addEnemy(700,720,'hoglin');
 w.blast(e.body.position.x,e.body.position.y);step(w,3);assert.equal(e.alive,true);assert.equal(e.hp,150);
 w.blast(e.body.position.x,e.body.position.y);assert.equal(e.alive,false);
});

test('Enderman treats one lingering fire source as one hit and a new TNT blast as the second',()=>{
 const w=fixture(),e=w.addEnemy(600,720,'enderman',{teleportSpots:[{x:400,feet:720},{x:800,feet:720},{x:1100,feet:720},{x:1400,feet:720}]});
 burnEnemy(w,e,'charge:1');assert.equal(e.teleportCount,1);assert.equal(e.hp,100);
 for(let i=0;i<10;i++)burnEnemy(w,e,'charge:1');step(w,2);assert.equal(e.alive,true);assert.equal(e.hp,100);
 w.blast(e.body.position.x,e.body.position.y);assert.equal(e.alive,false);
});

test('Enderman teleport can choose at least three distinct supported destinations',()=>{
 const w=fixture(),spots=[{x:400,feet:720},{x:700,feet:720},{x:1000,feet:720},{x:1300,feet:720}],e=w.addEnemy(400,720,'enderman',{teleportSpots:spots}),seen=new Set();
 for(let i=0;i<16;i++){
  e.teleportCount=0;e.hp=200;w.M.Body.setPosition(e.body,{x:400,y:720-e.feetOffset});
  hit(w,w.spawnProjectile('cobble',200,200,0,0),e);seen.add(e.body.position.x);
  assert.equal(e.teleportCount,1);assert.equal(teleportSpotValid(w,e,{x:e.body.position.x,feet:e.body.bounds.max.y}),true);
 }
 assert.ok(seen.size>=3);
});

test('slimeball rebounds from actual terrain and cannot damage the same armored mob twice',()=>{
 const w=fixture(),p=w.spawnProjectile('slimeball',300,600,0,400);let rebounded=false;
 for(let i=0;i<150;i++){w.step(1/120);if(p.body.velocity.y< -2&&p.body.position.y<690)rebounded=true;}
 assert.equal(rebounded,true);assert.equal(w.stats.removed,0);
 const e=w.addEnemy(800,720,'hoglin');hit(w,p,e);hit(w,p,e);assert.equal(e.hp,200);
});

test('wind charge pushes nearby creatures away and leaves distant creatures and terrain untouched',()=>{
 const w=fixture(),near=w.addEnemy(630,720,'hoglin'),far=w.addEnemy(1000,720,'hoglin'),pixels=w.grid.cells.slice();
 const p=w.spawnProjectile('wind',550,650,0,0);hit(w,p,near);
 assert.equal(p.dead,true);assert.ok(near.body.velocity.y<0);assert.ok(near.externalUntil>w.time);
 assert.equal(far.body.velocity.x,0);assert.equal(far.body.velocity.y,0);assert.equal(near.hp,300);assert.deepEqual(w.grid.cells,pixels);
});

test('a flying water bottle cools airborne lava without a terrain collision and splashes only once',()=>{
 const w=fixture({lavaSources:[{x:12,y:5}]});step(w,2);w.events.length=0;
 const p=w.spawnProjectile('water',500,420,500,0);step(w,.45);
 assert.equal(p.dead,true);assert.ok(w.stats.lavaCooled>0);
 const splashes=w.events.filter(e=>e.type==='splash');assert.equal(splashes.length,1);assert.equal(splashes[0].sound,'water_splash');
 assert.ok(splashes[0].y<500,'the bottle splashes in the airborne stream, above any floor');
 const cooled=[...w.lava.cells.values()].filter(c=>w.grid.get(c.gx*4,c.gy*4)===40);assert.equal(cooled.length,0);
 const solid=w.grid.cells.indexOf(40);assert.ok(solid>=0);
 const point={x:(solid%w.grid.width+.5)*w.s,y:(Math.floor(solid/w.grid.width)+.5)*w.s};
 const bodies=w.M.Composite.allBodies(w.engine.world);assert.ok(w.M.Query.point(bodies.filter(body=>body.plugin.terrain),point).length>0,'cooled pixels have a real collision mesh');
 assert.equal(bodies.includes(p.body),false);
 step(w,1);assert.equal(w.events.filter(e=>e.type==='splash').length,1);
});

test('a water bottle still splashes once on real solid ground without lava',()=>{
 const w=fixture(),before=w.grid.cells.slice(),p=w.spawnProjectile('water',400,640,0,300);step(w,.6);
 assert.equal(p.dead,true);assert.deepEqual(w.grid.cells,before);assert.equal(w.stats.lavaCooled,0);
 assert.deepEqual(w.events.filter(e=>e.type==='splash').map(e=>e.sound),['water_splash']);
});

test('Shulker stays armored while its lid has only just begun visibly opening',()=>{
 const w=fixture(),e=w.addEnemy(600,720,'shulker');
 for(let i=0;i<1200&&!e.shellOpen;i++)w.step(1/120);
 assert.equal(e.shellOpen,true);assert.ok(e.pose.openAmount>0&&e.pose.openAmount<.15);
 hit(w,w.spawnProjectile('cobble',500,600,0,0),e);assert.equal(e.hp,200);assert.equal(e.alive,true);
});

test('Shulker remains vulnerable during the visibly open part of its closing transition',()=>{
 const w=fixture(),e=w.addEnemy(600,720,'shulker');
 for(let i=0;i<1200&&!e.shellOpen;i++)w.step(1/120);
 for(let i=0;i<1200&&e.shellOpen;i++)w.step(1/120);
 assert.equal(e.shellOpen,false);assert.ok(e.pose.openAmount>.85);
 hit(w,w.spawnProjectile('cobble',500,600,0,0),e);assert.equal(e.alive,false);
});
