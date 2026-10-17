import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {SiegeWorld} from '../src/world.mjs';
import {buildLevel} from '../src/levels.mjs';
import {SLING_HOME,pullSling} from '../src/sling.mjs';
import {inventoryFor,spendAmmo,totalAmmo} from '../src/campaign.mjs';
import {updateOutcome} from '../src/outcome.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const strategies=JSON.parse(fs.readFileSync(new URL('../evidence/playability-search.json',import.meta.url)));
const slots={cobble:0,tnt:1,ender:2,fire:3};

function replay(plan,{initial=0,delay=0}={}){
 const scene=buildLevel(plan.level-1),w=new SiegeWorld(M,{grid:scene.grid,rear:scene.rear});
 for(const e of scene.enemies)w.addEnemy(e.x,e.feet,e.skin,e);
 const remaining=inventoryFor(plan.level-1),state={shots:totalAmmo(remaining),launch:null,quiet:0,winWait:0};let outcome=null;
 const advance=seconds=>{for(let i=0;i<seconds*120&&outcome===null;i++){
  if(state.launch){state.launch.age+=1/120;if(state.launch.age>.5)state.launch=null;}
  w.step(1/120);w.events.length=0;outcome=updateOutcome(state,w,1/120);
 }};
 try{
  advance(initial);
  for(const shot of plan.history){
   if(outcome!==null||w.enemies.every(e=>!e.alive))break;
   advance(delay);assert.ok(spendAmmo(remaining,slots[shot.kind]),'cannot exceed the per-item inventory');
   state.shots=totalAmmo(remaining);state.launch={age:0};
   w.spawnProjectile(shot.kind,shot.origin.x,shot.origin.y,shot.vx,shot.vy);advance(shot.wait??6);
  }
  // Include the real success animation, and stop physics as soon as the game ends.
  if(outcome===null&&w.enemies.every(e=>!e.alive))advance(1.5);
  assert.equal(outcome,true,`stage ${plan.level}, initial ${initial}s, delay ${delay}s must win before the production loss timer`);
 }finally{M.Events.off(w.engine);M.Composite.clear(w.engine.world,false);M.Engine.clear(w.engine);}
}

test('all ten stages win with legal CDP inputs, finite inventory, and the production outcome timer',()=>{
 assert.equal(strategies.length,10);
 for(const plan of strategies){
  const scene=buildLevel(plan.level-1),budget=inventoryFor(plan.level-1);
  assert.ok(plan.history.length<=scene.shots);
  for(const shot of plan.history){
   assert.deepEqual(shot.pointer,{x:Math.fround(shot.input.x),y:Math.fround(shot.input.y+118)-118},'saved pointer matches production CDP precision');
   const current=pullSling(shot.pointer);
   assert.ok(Math.hypot(current.origin.x-shot.origin.x,current.origin.y-shot.origin.y)<.001,'saved shot uses the real launcher');
   assert.ok(Math.abs(current.vx-shot.vx)<.00001&&Math.abs(current.vy-shot.vy)<.00001,'saved velocity matches actual pointer input');
   assert.ok(shot.vx<=1430&&shot.vy>=-1200);assert.ok(spendAmmo(budget,slots[shot.kind]));
  }
  replay(plan);
 }
});

test('final stage wins after all fifteen realistic idle and input timing offsets',()=>{
 const plan=strategies[9];assert.equal(plan.timingChecks.length,15);
 for(const timing of plan.timingChecks)replay(plan,timing);
});

test('early and middle stages win in their documented aiming-delay scenarios',()=>{
 for(const plan of strategies.slice(0,9)){
  assert.equal(plan.timingChecks.length,plan.level===8?2:4,`stage ${plan.level} must include its documented timing scenarios`);
  for(const timing of plan.timingChecks)replay(plan,timing);
 }
});


test('stage two cannot count its old late resting-cobble kill after the loss screen',()=>{
 const plan=strategies[1],ideal=pullSling({x:SLING_HOME.x-135*Math.cos(.12),y:SLING_HOME.y+135*Math.sin(.12)});
 const input=ideal.origin,pointer={x:Math.fround(input.x),y:Math.fround(input.y+118)-118};
 const tooLate={kind:'cobble',input,pointer,...pullSling(pointer),angle:.12,pull:1,wait:6};
 assert.throws(()=>replay({...plan,history:[...plan.history.slice(0,-1),tooLate]}),/must win before the production loss timer/);
});
