import test from 'node:test';
import assert from 'node:assert/strict';
import {ENCOUNTER_PROFILES,initEncounter,tickEncounter,encounterDamageMultiplier,summonWitherSkeleton} from '../src/encounters.mjs';
import {buildNether} from '../src/levels-nether.mjs';
import {buildEnd} from '../src/levels-end.mjs';
import {buildSift} from '../src/levels-sift.mjs';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {damageEnemy} from '../src/combat.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function fixture(skin){
 const p=ENCOUNTER_PROFILES[skin],body=M.Bodies.rectangle(1100,500,p.width,p.height);
 M.Body.setMass(body,p.mass);
 const e={id:1,skin,body,alive:true,hp:p.hp,dimensions:p,pose:{},facing:1,walkDistance:0,externalUntil:0};
 const world={M,time:0,width:1536,height:864,projectiles:[],events:[],sample:()=>0,engine:M.Engine.create()};
 M.Composite.add(world.engine.world,body);initEncounter(e,0,{flightBounds:{left:950,right:1300,top:280,bottom:570}});return {world,e};
}
test('native Sift profiles differ in shape and role; each campaign ends in its own boss',()=>{
 assert.ok(ENCOUNTER_PROFILES.sift_sifter.width>ENCOUNTER_PROFILES.sift_sifter.height);
 assert.ok(ENCOUNTER_PROFILES.sift_singer.height>ENCOUNTER_PROFILES.sift_blub.height*2);
 for(const [build,boss] of [[buildNether,'wither'],[buildEnd,'ender_dragon'],[buildSift,'sift_echo_golem']])assert.equal(build(9).enemies.filter(e=>e.skin===boss).length,1);
 const sift=Array.from({length:10},(_,i)=>buildSift(i));
 assert.deepEqual([...new Set(sift.flatMap(s=>s.enemies.map(e=>e.skin)))].sort(),['sift_blub','sift_echo_golem','sift_sifter','sift_singer']);
 assert.ok(sift[0].enemies.some(e=>e.skin==='sift_blub')&&sift[0].enemies.some(e=>e.skin==='sift_sifter'));
});
test('all authored native bodies initially fit clear space above real support',()=>{
 for(const build of [buildNether,buildEnd,buildSift])for(let n=0;n<10;n++){
  const scene=build(n);
  for(const e of scene.enemies){const p=ENCOUNTER_PROFILES[e.skin];if(!p)continue;
   assert.equal(e.height,p.height);
   for(let y=e.feet-p.height+2;y<e.feet-2;y+=3)for(let x=e.x-p.width/2+2;x<e.x+p.width/2-2;x+=3)assert.equal(scene.grid.get(x/3,y/3),0,`${scene.dimension} ${n+1} ${e.skin}: ${x},${y}`);
   for(const x of p.flying?[e.x]:[e.x-p.width*.3,e.x+p.width*.3])assert.ok(scene.grid.get(x/3,e.feet/3),`${scene.dimension} ${n+1}: support`);
  }
 }
});
test('dragon remains inside a bounded arena through a full cycle of live Matter motion',()=>{
 for(const skin of ['ender_dragon']){
  const {world,e}=fixture(skin),positions=[],phases=new Set();
  for(let i=0;i<3600;i++){world.time+=1/120;assert.equal(tickEncounter(world,e,1/120),true);M.Engine.update(world.engine,1000/120);positions.push({...e.body.position});phases.add(e.encounterPhase);}
  assert.ok(positions.every(p=>p.x>900&&p.x<1350&&p.y>240&&p.y<620));
  assert.ok(Math.max(...positions.map(p=>p.x))-Math.min(...positions.map(p=>p.x))>100);
  assert.ok(phases.size>=3);assert.equal(e.hp,ENCOUNTER_PROFILES[skin].hp);assert.ok(e.pose.wingFlap>=0&&e.pose.wingFlap<=1);
  M.Engine.clear(world.engine);
 }
});
test('Wither has calm subtle hover, no charge, pulse, or ammunition deflection',()=>{
 const {world,e}=fixture('wither'),p={ammo:{id:'cobble'},body:M.Bodies.circle(1100,480,10)},positions=[];world.projectiles=[p];
 for(let i=0;i<2400;i++){world.time+=1/120;tickEncounter(world,e,1/120);M.Engine.update(world.engine,1000/120);positions.push({...e.body.position});assert.equal(e.encounterPhase,'hover');assert.equal(e.pose.attackCharge,0);}
 assert.equal(world.events.filter(ev=>ev.type==='encounterPulse').length,0);assert.equal(p.body.velocity.x,0);assert.equal(p.body.velocity.y,0);
 assert.ok(Math.max(...positions.map(p=>p.x))-Math.min(...positions.map(p=>p.x))<35);
 M.Engine.clear(world.engine);
});
test('each summon chooses the nearest real supported clear surface and avoids occupied bodies',()=>{
 const scene=buildNether(9),world=new SiegeWorld(M,scene),boss=scene.enemies.find(e=>e.skin==='wither'),e=world.addEnemy(boss.x,boss.feet,boss.skin,boss);
 const adds=[];
 for(let i=0;i<3;i++){const add=summonWitherSkeleton(world,e);assert.ok(add);adds.push(add);assert.equal(add.skin,'wither_skeleton');assert.equal(add.dimensions.height,116);assert.ok(add.hp>0);
  const box=add.body.bounds;for(let x=box.min.x+3;x<box.max.x-3;x+=3)assert.ok(world.sample(x,box.max.y+1));
  for(let y=box.min.y+2;y<box.max.y-2;y+=3)for(let x=box.min.x+2;x<box.max.x-2;x+=3)assert.equal(world.sample(x,y),0);
  for(const other of world.enemies.filter(o=>o!==add)){const b=other.body.bounds;assert.ok(box.max.x<=b.min.x||box.min.x>=b.max.x||box.max.y<=b.min.y||box.min.y>=b.max.y);}
 }
 assert.equal(new Set(adds.map(a=>a.body.position.x)).size,3);assert.equal(world.events.filter(ev=>ev.type==='summon').length,3);
 assert.ok(adds.every(a=>Math.abs(a.body.position.x-e.body.position.x)<180));
 M.Events.off(world.engine);M.Composite.clear(world.engine.world,false);M.Engine.clear(world.engine);
});
test('three confirmed Wither attacks each remove one third and the lethal third also summons',()=>{
 const scene=buildNether(9),world=new SiegeWorld(M,scene),actor=scene.enemies.find(e=>e.skin==='wither'),e=world.addEnemy(actor.x,actor.feet,actor.skin,actor);
 for(let i=0;i<3;i++){
  damageEnemy(world,e,i===0?1000:10,{source:`attack:${i}`,kind:i===1?'ender':'cobble'});
  assert.equal(e.hp,450-(i+1)*150);assert.equal(world.enemies.filter(a=>a.skin==='wither_skeleton').length,i+1);
  damageEnemy(world,e,1000,{source:`attack:${i}`,kind:'cobble'});assert.equal(e.hp,450-(i+1)*150);
 }
 assert.equal(e.alive,false);assert.equal(world.enemies.filter(a=>a.alive).length,3);
 M.Events.off(world.engine);M.Composite.clear(world.engine.world,false);M.Engine.clear(world.engine);
});
test('Sift scenes and final End fountain leave the sky open instead of filling rear rooms',()=>{
 for(let i=0;i<10;i++){const s=buildSift(i);assert.equal(s.visual.rooms.length,0);let longest=0;for(let y=0;y<14*16;y++){let run=0;for(let x=17*16;x<32*16;x++){const material=s.rear.grid.get(x,y);run=material>=41&&material<=47&&!s.grid.get(x,y)?run+1:0;longest=Math.max(longest,run);}}assert.ok(longest<=64,`Sift ${i+1}: large structural rear rectangle`);}
 const s=buildEnd(9);assert.equal(s.visual.rooms.length,0);assert.ok(s.grid.get(25*16+8,12*16+8)===7);assert.equal(s.grid.get(23*16+8,12*16+8),0);assert.equal(s.rear.grid.get(25*16,7*16),0);
 for(let x=22;x<=28;x++){
  assert.equal(s.grid.get(x*16+8,15*16+8),7);
  assert.equal(s.grid.get(x*16+8,13*16+8),x===25?7:0);
  assert.equal(s.grid.get(x*16+8,14*16+8),[22,25,28].includes(x)?7:0);
 }
});
test('elite pulse is telegraphed and changes only nearby airborne ammunition',()=>{
 const {world,e}=fixture('sift_singer'),near={dead:false,type:'ammo',ammo:{id:'cobble'},body:M.Bodies.circle(1120,470,10)},far={dead:false,type:'ammo',ammo:{id:'cobble'},body:M.Bodies.circle(1500,100,10)};
 world.projectiles=[near,far];world.time=3.5;tickEncounter(world,e,.01);assert.equal(e.encounterPhase,'charge');assert.equal(near.body.velocity.x,0);
 world.time=4.15;tickEncounter(world,e,.01);assert.ok(Math.hypot(near.body.velocity.x,near.body.velocity.y)>0);assert.equal(far.body.velocity.x,0);assert.equal(far.body.velocity.y,0);assert.equal(e.hp,200);
 assert.equal(world.events.filter(ev=>ev.type==='encounterPulse').length,1);
 world.time=4.2;tickEncounter(world,e,.01);assert.equal(world.events.filter(ev=>ev.type==='encounterPulse').length,1);
});
test('freeze, death and external weapon impulse suspend encounter control; recovery remains hittable',()=>{
 const {world,e}=fixture('wither');e.frozen=true;assert.equal(tickEncounter(world,e,.1),false);assert.equal(e.body.force.y,0);
 e.frozen=false;e.externalUntil=1;assert.equal(tickEncounter(world,e,.1),true);assert.equal(e.body.force.y,0);
 e.alive=false;assert.equal(tickEncounter(world,e,.1),false);
 const ordinary=fixture('sift_blub');assert.equal(tickEncounter(ordinary.world,ordinary.e,.1),false);
 for(const phase of ['brace','charge','recover']){e.encounterPhase=phase;assert.ok(encounterDamageMultiplier(e,'cobble')>=1);}
});
test('integrated native encounters survive ten untouched seconds and preserve their map',()=>{
 for(let level=0;level<10;level++){
  const scene=buildSift(level),world=new SiegeWorld(M,scene),count=scene.grid.count();
  for(const actor of scene.enemies)world.addEnemy(actor.x,actor.feet,actor.skin,actor);
  for(let tick=0;tick<1200;tick++){world.step(1/120);world.events.length=0;}
  assert.equal(world.enemies.filter(e=>e.alive).length,scene.enemies.length,`Sift ${level+1}`);
  assert.equal(scene.grid.count(),count);assert.equal(world.debris.length,0);
  M.Events.off(world.engine);M.Composite.clear(world.engine.world,false);M.Engine.clear(world.engine);
 }
});
test('integrated boss damage rewards recovery and still deduplicates one source',()=>{
 const scene=buildSift(9),world=new SiegeWorld(M,scene),actor=scene.enemies.find(e=>e.skin==='sift_echo_golem'),e=world.addEnemy(actor.x,actor.feet,actor.skin,actor);
 e.encounterPhase='recover';damageEnemy(world,e,100,{source:'stone:1',kind:'cobble'});assert.equal(e.hp,300);
 damageEnemy(world,e,100,{source:'stone:1',kind:'cobble'});assert.equal(e.hp,300);
 e.encounterPhase='charge';damageEnemy(world,e,100,{source:'stone:2',kind:'cobble'});assert.equal(e.hp,200);
 M.Events.off(world.engine);M.Composite.clear(world.engine.world,false);M.Engine.clear(world.engine);
});
