import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';
import {SiegeWorld} from '../src/world.mjs';
import * as campaign from '../src/campaign.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function fixture(options={}){const grid=new PixelGrid(512,288);grid.fill(0,240,512,48,7);return new SiegeWorld(M,{grid,...options});}
function advance(w,seconds){for(let i=0;i<seconds*120;i++)w.step(1/120);}
function collide(w,p,e,velocity={x:0,y:0},enemyVelocity={x:.36,y:0}){
 w.before=new Map([[p.body.id,{...velocity,omega:0}],[e.body.id,{...enemyVelocity,omega:0}]]);
 w.processContact({bodyA:p.body,bodyB:e.body,collision:{normal:{x:1,y:0},supports:[{...e.body.position}]}});
 w.time+=.15;
}
for(const kind of ['cobble','ender','slimeball','anvil'])test(`${kind}: stationary and slow rolling projectiles cannot hurt a walking mob`,()=>{
 const w=fixture(),e=w.addEnemy(800,720,'hoglin',{stationary:true}),p=w.spawnProjectile(kind,750,700,0,0);
 collide(w,p,e);assert.equal(e.hp,300);
 collide(w,p,e,{x:1.2,y:.1});assert.equal(e.hp,300);
 assert.equal(e.projectileHits.has(p.id),false,'a harmless touch does not spend the future impact');
 collide(w,p,e,{x:0,y:6});assert.ok(e.hp<300,'a fast falling projectile is dangerous again');
});
test('a real dropped stone damages, but a settled stone remains harmless when a hoglin walks into it',()=>{
 const w=fixture(),e=w.addEnemy(800,720,'hoglin',{stationary:true}),p=w.spawnProjectile('cobble',800,500,0,0);
 advance(w,1.1);assert.equal(e.hp,200);
 const resting=w.spawnProjectile('cobble',650,700,0,0);advance(w,2);
 M.Body.setPosition(e.body,{x:resting.body.position.x+50,y:e.body.position.y});
 M.Body.setVelocity(e.body,{x:-.36,y:0});e.stationary=false;e.facing=-1;
 const hp=e.hp;advance(w,1.5);assert.equal(e.hp,hp);
});
test('pearl begins fading after five seconds and then leaves the physics world',()=>{
 const w=fixture(),p=w.spawnProjectile('ender',300,500,0,0);
 advance(w,4.9);assert.equal(p.dead,undefined);
 advance(w,.25);assert.equal(p.dead,undefined);assert.ok(w.snapshot().projectiles[0].opacity<1);
 advance(w,.7);assert.equal(p.dead,true);assert.equal(w.projectiles.length,0);
});
test('a real TNT blast can turn a settled stone back into a dangerous projectile',()=>{
 const w=fixture(),e=w.addEnemy(780,720,'hoglin',{stationary:true}),p=w.spawnProjectile('cobble',650,700,0,0);
 advance(w,2);assert.equal(e.hp,300);assert.ok(p.body.speed<.1);
 w.blast(600,750);assert.equal(e.hp,300,'the mob is outside the blast radius');
 advance(w,.7);assert.equal(e.hp,200,'the moving stone, rather than the blast, hits the mob');
});
test('successful pearl phase restarts its five-second clock while a flying hit still damages',()=>{
 const w=fixture();w.grid.fill(200,80,16,130,3);w.synchronize();
 const p=w.spawnProjectile('ender',570,400,600,0);w.time=4.5;p.age=4.5;
 w.before=new Map([[p.body.id,{x:10,y:0,omega:0}]]);
 const wall=[...w.staticTiles.values()].find(b=>b.bounds.min.x<=600&&b.bounds.max.x>=600&&b.bounds.min.y<=400&&b.bounds.max.y>=400);
 w.processContact({bodyA:p.body,bodyB:wall,collision:{normal:{x:-1,y:0},supports:[{x:600,y:400}]}});
 assert.equal(p.uses,1);assert.equal(p.expiresAt,9.5);
 const e=w.addEnemy(900,720,'hoglin');collide(w,p,e,{x:8,y:0});assert.equal(e.hp,225);assert.equal(p.expiresAt,9.5);
});
test('two lava-lit stones defeat a Warden through two real hits plus burning',()=>{
 const w=fixture({lavaSources:[{x:10,y:5}]});advance(w,.3);
 const e=w.addEnemy(1100,720,'warden',{stationary:true});
 for(let i=0;i<2;i++){
  const p=w.spawnProjectile('cobble',500,250,0,0);advance(w,.025);assert.equal(p.ignited,true);
  collide(w,p,e,{x:8,y:0});advance(w,1.9);
  assert.ok(Math.abs(e.hp-(i===0?150:0))<1e-8);
 }
 assert.equal(e.alive,false);
});
test('a resting burning stone cannot ignite a mob by being nudged',()=>{
 const w=fixture(),e=w.addEnemy(800,720,'warden'),p=w.spawnProjectile('cobble',750,700,0,0);p.ignited=true;
 collide(w,p,e);assert.equal(e.hp,300);assert.equal(e.burnTicks.length,0);
});
test('snowball fully immobilizes an airborne mob until a damaging hit breaks the ice',()=>{
 const w=fixture(),e=w.addEnemy(800,720,'hoglin');advance(w,.2);
 M.Body.setPosition(e.body,{x:800,y:400});M.Body.setVelocity(e.body,{x:2,y:3});
 collide(w,w.spawnProjectile('snowball',700,600,500,0),e,{x:8,y:0});
 const position={...e.body.position},pose={...e.pose};advance(w,6);
 assert.equal(e.frozen,true);assert.equal(e.body.isStatic,true);assert.deepEqual(e.body.position,position);assert.deepEqual(e.pose,pose);
 collide(w,w.spawnProjectile('cobble',700,300,0,0),e);assert.equal(e.frozen,true,'a resting stone cannot break ice');
 collide(w,w.spawnProjectile('cobble',700,300,500,0),e,{x:8,y:0});
 assert.equal(e.frozen,false);assert.equal(e.body.isStatic,false);assert.equal(e.hp,200);assert.equal(e.body.mass,3.6);
 advance(w,.4);assert.ok(e.body.position.y>position.y+20);
});
test('current-season completion times, not legacy unlocked flags, determine progression and dimensions',()=>{
 assert.equal(typeof campaign.progressFromTimes,'function');assert.equal(typeof campaign.worldUnlocked,'function');
 assert.deepEqual(campaign.progressFromTimes([]),{unlocked:1,completed:[]});
 assert.deepEqual(campaign.progressFromTimes([7317,null,4000]),{unlocked:2,completed:[0,2]});
 assert.equal(campaign.worldUnlocked('nether',[7317]),false);assert.equal(campaign.worldUnlocked('end',[]),false);
 const all=Array(10).fill(1000);assert.equal(campaign.worldUnlocked('nether',all),true);assert.equal(campaign.worldUnlocked('end',all),false);
 assert.equal(campaign.worldUnlocked('end',all,all.slice(0,9)),false);
 assert.equal(campaign.worldUnlocked('end',all,all),true);assert.equal(campaign.worldUnlocked('end',[],all),false);
});
