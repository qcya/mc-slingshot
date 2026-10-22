import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {buildEnd} from '../src/levels-end.mjs';
import {buildSift} from '../src/levels-sift.mjs';
import {setupEncounter,tickEncounter,reflectEncounterProjectile,encounterDamageMultiplier} from '../src/encounters.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const dispose=w=>{M.Events.off(w.engine);M.Composite.clear(w.engine.world,false);M.Engine.clear(w.engine);};
test('dragon setup uses two supported standard crystals and healing stops as each is destroyed',()=>{
 const scene=buildEnd(9),world=new SiegeWorld(M,scene),actor=scene.enemies.find(e=>e.skin==='ender_dragon'),e=world.addEnemy(actor.x,actor.feet,actor.skin,actor);
 setupEncounter(world,e);setupEncounter(world,e);
 const crystals=world.projectiles.filter(p=>p.healingOwner===e.id);assert.equal(crystals.length,2);
 for(const p of crystals){assert.equal(p.ammo.id,'crystal');assert.equal(p.body.isStatic,true);assert.equal(p.placed,true);assert.ok(world.sample(p.body.position.x,p.body.bounds.max.y+1));}
 e.hp=500;tickEncounter(world,e,1);assert.equal(e.hp,512);assert.equal(e.healingCount,2);
 world.remove(crystals[0]);tickEncounter(world,e,1);assert.equal(e.hp,518);assert.equal(e.healingCount,1);
 world.remove(crystals[1]);tickEncounter(world,e,1);assert.equal(e.hp,518);assert.equal(e.healingActive,false);
 e.hp=599;crystals[0].dead=false;tickEncounter(world,e,1);assert.equal(e.hp,600);e.alive=false;tickEncounter(world,e,1);assert.equal(e.hp,600);
 dispose(world);
});
test('golem shield telegraphs, reflects one real front projectile and exposes a timed core',()=>{
 const scene=buildSift(9),world=new SiegeWorld(M,scene),actor=scene.enemies.find(e=>e.skin==='sift_echo_golem'),e=world.addEnemy(actor.x,actor.feet,actor.skin,actor);
 assert.equal(e.facing,-1);world.time=.5;tickEncounter(world,e,.01);assert.equal(e.encounterPhase,'telegraph');assert.equal(e.echoShieldActive,false);
 world.time=1.2;tickEncounter(world,e,.01);assert.equal(e.echoShieldActive,true);
 const p=world.spawnProjectile('cobble',e.body.position.x-60,e.body.position.y,600,0);world.before=new Map([[p.body.id,{x:10,y:0}]]);
 assert.equal(reflectEncounterProjectile(world,e,p),true);assert.ok(p.body.velocity.x<0);assert.equal(e.echoShieldActive,false);assert.equal(e.echoRecoveryUntil,world.time+2.4);assert.equal(e.encounterPhase,'recover');assert.equal(encounterDamageMultiplier(e,'cobble'),1.5);
 assert.equal(world.events.filter(ev=>ev.type==='echoReflect').length,1);
 world.time+=.2;assert.equal(reflectEncounterProjectile(world,e,p),false);
 world.time=e.echoRecoveryUntil+.01;tickEncounter(world,e,.01);assert.equal(e.encounterPhase,'telegraph');assert.equal(encounterDamageMultiplier(e,'cobble'),1);
 dispose(world);
});
test('golem does not reflect rear attacks, returning tridents, explosives or inert ammunition',()=>{
 const scene=buildSift(9),world=new SiegeWorld(M,scene),actor=scene.enemies.find(e=>e.skin==='sift_echo_golem'),e=world.addEnemy(actor.x,actor.feet,actor.skin,actor);
 world.time=1.2;tickEncounter(world,e,.01);
 for(const [kind,dx,vx,returning] of [['cobble',70,-600,false],['trident',-70,600,true],['tnt',-70,600,false],['cobble',-70,0,false]]){
  const p=world.spawnProjectile(kind,e.body.position.x+dx,e.body.position.y,vx,0);p.returning=returning;world.before=new Map([[p.body.id,{...p.body.velocity}]]);assert.equal(reflectEncounterProjectile(world,e,p),false,kind);
 }
 assert.equal(e.echoShieldActive,true);assert.equal(world.events.filter(ev=>ev.type==='encounterPulse').length,0);dispose(world);
});
