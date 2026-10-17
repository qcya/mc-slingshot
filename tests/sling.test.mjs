import test from 'node:test';import assert from 'node:assert/strict';import {SLING_HOME,pullSling} from '../src/sling.mjs';
test('弹弓向左下拉时弹药兜与实际发射原点一致，且不拉进地面',()=>{
 const p=pullSling({x:30,y:760});assert.ok(p.origin.x<SLING_HOME.x&&p.origin.y>SLING_HOME.y);
 assert.ok(p.origin.y+16<672);assert.ok(p.vx>0&&p.vy<0);assert.ok(p.power<=1);
 assert.equal(p.vx,(SLING_HOME.x-p.origin.x)*10.8);
});
test('弹弓未拉开时力度为零，最大拉伸长度有上限',()=>{
 assert.equal(pullSling(SLING_HOME).power,0);const p=pullSling({x:-2000,y:100});
 assert.ok(Math.hypot(p.origin.x-SLING_HOME.x,p.origin.y-SLING_HOME.y)<=135.001);
});
