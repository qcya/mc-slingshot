import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {buildLevel} from '../src/levels.mjs';
import {SiegeWorld} from '../src/world.mjs';
import {AMMO} from '../src/config.mjs';
import {pullSling} from '../src/sling.mjs';
import {inventoryFor,spendAmmo,totalAmmo,hotbarSlots} from '../src/campaign.mjs';
import {updateOutcome} from '../src/outcome.mjs';
const Matter=createRequire(import.meta.url)('../vendor/matter.min.js');

for(const dimension of ['nether','end','sift'])test(`${dimension}: every map wins through legal launcher input and its finite unlocked inventory`,()=>{
 const plans=JSON.parse(fs.readFileSync(new URL(`../evidence/${dimension}-playability.json`,import.meta.url)));
 assert.deepEqual(plans.map(p=>p.level),[1,2,3,4,5,6,7,8,9,10]);
 for(const plan of plans){
  const level=plan.level-1,scene=buildLevel(level,dimension),world=new SiegeWorld(Matter,scene),remaining=inventoryFor(level,dimension);
  for(const enemy of scene.enemies)world.addEnemy(enemy.x,enemy.feet,enemy.skin,enemy);
  const state={shots:totalAmmo(remaining),launch:null,quiet:0,winWait:0};let outcome=null;
  const advance=seconds=>{for(let i=0;i<seconds*120&&outcome===null;i++){
   if(state.launch){state.launch.age+=1/120;if(state.launch.age>.5)state.launch=null;}
   world.step(1/120);world.events.length=0;outcome=updateOutcome(state,world,1/120);
  }};
  try{
   assert.ok(plan.history.length<=scene.shots,`${dimension} ${plan.level}: total budget`);
   for(const shot of plan.history){
    if(outcome!==null||world.enemies.every(e=>!e.alive))break;
    const slot=AMMO.findIndex(ammo=>ammo.id===shot.kind);
    assert.ok(hotbarSlots({unlocked:plan.level},dimension).includes(slot),`${dimension} ${plan.level}: ammunition must be unlocked`);
    assert.ok(spendAmmo(remaining,slot),`${dimension} ${plan.level}: cannot exceed ${shot.kind} inventory`);
    const top=dimension==='sift'?70:118;
    assert.deepEqual(shot.pointer,{x:Math.fround(shot.input.x),y:Math.fround(shot.input.y+top)-top});
    const actual=pullSling(shot.pointer);
    assert.ok(Math.hypot(actual.origin.x-shot.origin.x,actual.origin.y-shot.origin.y)<.001);
    assert.ok(Math.abs(actual.vx-shot.vx)<.00001&&Math.abs(actual.vy-shot.vy)<.00001);
    state.shots=totalAmmo(remaining);state.launch={age:0};
    world.spawnProjectile(shot.kind,actual.origin.x,actual.origin.y,actual.vx,actual.vy);advance(shot.wait??6);
   }
   if(outcome===null&&world.enemies.every(e=>!e.alive))advance(1.5);
   assert.equal(outcome,true,`${dimension} ${plan.level}: finite route must win through the production outcome timer`);
  }finally{Matter.Events.off(world.engine);Matter.Composite.clear(world.engine.world,false);Matter.Engine.clear(world.engine);}
 }
});
