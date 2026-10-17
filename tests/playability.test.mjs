import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import fs from 'node:fs';
import {SiegeWorld} from '../src/world.mjs';import {buildLevel} from '../src/levels.mjs';
import {SLING_HOME,pullSling} from '../src/sling.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js'),strategies=JSON.parse(fs.readFileSync(new URL('../evidence/playability-search.json',import.meta.url)));
test('五关在给定弹药数内均可由完整 Matter 模式正常攻击获胜',()=>{
 assert.equal(strategies.length,5);
 for(const plan of strategies){
  const scene=buildLevel(plan.level-1),w=new SiegeWorld(M,{grid:scene.grid,rear:scene.rear});
  for(const e of scene.enemies)w.addEnemy(e.x,e.feet,e.skin);
  assert.ok(plan.history.length<=scene.shots);
  for(const shot of plan.history){
   // Validate the exact drag limits used by the real launcher.
   const current=pullSling({x:SLING_HOME.x-135*Math.cos(shot.angle),y:SLING_HOME.y+135*Math.sin(shot.angle)});
   assert.ok(Math.hypot(current.origin.x-shot.origin.x,current.origin.y-shot.origin.y)<.001,'saved shot must use the current sling position');
   assert.ok(shot.vx<=1430&&shot.vy>=-1200);
   w.spawnProjectile(shot.kind,shot.origin.x,shot.origin.y,shot.vx,shot.vy);
   for(let i=0;i<720;i++){w.step(1/120);w.events.length=0;if(w.enemies.every(e=>!e.alive))break;}
   if(w.enemies.every(e=>!e.alive))break;
  }
  assert.equal(w.enemies.filter(e=>e.alive).length,0,`level ${plan.level}`);
 }
});
