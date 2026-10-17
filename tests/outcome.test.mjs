import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';import {PixelGrid} from '../src/pixels.mjs';import {updateOutcome} from '../src/outcome.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const state=()=>({shots:0,launch:null,quiet:0,winWait:0});

test('最后 TNT 炸飞后摔死的怪物仍判胜利，失败计时不能抢过死亡动画',()=>{
 const grid=new PixelGrid(512,288);grid.fill(0,224,512,64,7);const w=new SiegeWorld(M,{grid}),e=w.addEnemy(700,672),s=state();
 w.blast(635,646);assert.ok(e.alive&&e.hp<3);let outcome=null;
 for(let i=0;i<420&&outcome===null;i++){w.step(1/120);outcome=updateOutcome(s,w,1/120);}
 assert.equal(e.alive,false);assert.equal(outcome,true);assert.ok(e.dead);assert.ok(w.time-e.deathAt>1.15);
});

test('剩余怪物存活时弹药耗尽仍正常判失败，未结束的引信阻止提前失败',()=>{
 const s=state(),world={enemies:[{alive:true}],active:()=>true};
 for(let i=0;i<480;i++)assert.equal(updateOutcome(s,world,1/120),null);assert.equal(s.quiet,0);
 world.active=()=>false;let outcome=null;for(let i=0;i<250&&outcome===null;i++)outcome=updateOutcome(s,world,1/120);assert.equal(outcome,false);
});
