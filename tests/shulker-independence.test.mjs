import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {buildEnd} from '../src/levels-end.mjs';
import {freezeEnemy,thawEnemy} from '../src/combat.mjs';

const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function endWorld(level){
 const scene=buildEnd(level),world=new SiegeWorld(M,scene);
 for(const actor of scene.enemies)world.addEnemy(actor.x,actor.feet,actor.skin,actor);
 return world;
}
const shells=world=>world.enemies.filter(e=>e.skin==='shulker');
function dispose(world){M.Events.off(world.engine);M.Composite.clear(world.engine.world,false);M.Engine.clear(world.engine);}

test('authored End groups have visibly staggered first Shulker openings',()=>{
 for(let level=0;level<10;level++){
  const world=endWorld(level),firstOpen=new Map();
  try{
   const actors=shells(world);
   for(let frame=0;frame<600&&firstOpen.size<actors.length;frame++){
    world.step(1/120);world.events.length=0;
    for(const e of actors)if(e.shellOpen&&!firstOpen.has(e.id))firstOpen.set(e.id,world.time);
   }
   assert.equal(firstOpen.size,actors.length,`End ${level+1}: every shell opens`);
   const times=[...firstOpen.values()];
   assert.ok(Math.max(...times)-Math.min(...times)>=.25,`End ${level+1}: first openings must span a visible interval`);
  }finally{dispose(world);}
 }
});

test('each Shulker transition emits only its own matching sound and visible lid motion',()=>{
 const world=endWorld(5),actors=shells(world),transitions=new Map(actors.map(e=>[e.id,[]]));
 let isolated=0;
 try{
  for(let frame=0;frame<2400;frame++){
   const before=new Map(actors.map(e=>[e.id,{open:e.shellOpen,amount:e.shellAmount}]));
   world.events.length=0;world.step(1/120);
   const changed=actors.filter(e=>e.shellOpen!==before.get(e.id).open);
   const sounds=world.events.filter(event=>['shulker_open','shulker_close'].includes(event.sound));
   assert.equal(sounds.length,changed.length,'one sound per actual shell transition');
   for(const e of changed){
    const own=sounds.filter(event=>event.enemyId===e.id);
    assert.equal(own.length,1,`sound must identify transitioning Shulker ${e.id}`);
    assert.equal(own[0].sound,e.shellOpen?'shulker_open':'shulker_close');
    assert.equal(own[0].x,e.body.position.x);assert.equal(own[0].y,e.body.position.y);
    assert.equal(e.pose.openAmount,e.shellAmount);
    assert.ok(e.shellOpen?e.shellAmount>before.get(e.id).amount:e.shellAmount<before.get(e.id).amount);
    transitions.get(e.id).push({time:world.time,open:e.shellOpen});
   }
   if(changed.length===1)isolated++;
  }
  for(const [id,events]of transitions){
   assert.ok(events.length>=4,`Shulker ${id} repeatedly opens and closes`);
   assert.deepEqual(events.slice(0,4).map(event=>event.open),[true,false,true,false]);
   assert.ok(new Set(events.slice(1).map((event,i)=>(event.time-events[i].time).toFixed(2))).size>=3,'successive durations vary');
  }
  assert.ok(isolated>=12,'siblings frequently stay in their own state when one shell transitions');
 }finally{dispose(world);}
});

test('freezing and thawing one Shulker never shifts sibling schedules or deterministic replays',()=>{
 const baseline=endWorld(5),replay=endWorld(5),interrupted=endWorld(5);
 const frozen=shells(interrupted)[0];
 try{
  for(let frame=0;frame<1800;frame++){
   if(frame===120)freezeEnemy(interrupted,frozen);
   if(frame===600)thawEnemy(interrupted,frozen);
   for(const world of [baseline,replay,interrupted]){world.events.length=0;world.step(1/120);}
   for(const e of shells(baseline)){
    for(const world of [replay,interrupted]){
     if(world===interrupted&&e.id===frozen.id)continue;
     const other=world.enemies.find(actor=>actor.id===e.id);
     assert.equal(other.shellOpen,e.shellOpen);assert.equal(other.shellUntil,e.shellUntil);assert.equal(other.shellAmount,e.shellAmount);
    }
   }
  }
  assert.notEqual(frozen.shellUntil,shells(baseline)[0].shellUntil,'only the frozen actor pauses its cycle');
 }finally{for(const world of [baseline,replay,interrupted])dispose(world);}
});
