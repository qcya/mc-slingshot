import test from 'node:test';import assert from 'node:assert/strict';import {SLING_HOME,pullSling,pouchRotation} from '../src/sling.mjs';

test('弹药兜长轴始终垂直于发射方向',()=>{
 for(const [vx,vy] of [[1000,0],[0,-1000],[-600,-400],[700,500]]){
  const angle=pouchRotation(vx,vy);assert.ok(Math.abs(Math.cos(angle)*vx+Math.sin(angle)*vy)<1e-8);
 }
});
test('弹弓向左下拉时弹药兜与实际发射原点一致，且不拉进地面',()=>{
 const p=pullSling({x:30,y:760});assert.ok(p.origin.x<SLING_HOME.x&&p.origin.y>SLING_HOME.y);
 assert.ok(p.origin.y+16<672);assert.ok(p.vx>0&&p.vy<0);assert.ok(p.power<=1);
 assert.equal(p.vx,(SLING_HOME.x-p.origin.x)*10.8);
});
test('弹弓未拉开时力度为零，最大拉伸长度有上限',()=>{
 assert.equal(pullSling(SLING_HOME).power,0);const p=pullSling({x:-2000,y:100});
 assert.ok(Math.hypot(p.origin.x-SLING_HOME.x,p.origin.y-SLING_HOME.y)<=135.001);
});
test('弹弓可向后和任意小力度发射，不强制向右',()=>{
 const backward=pullSling({x:SLING_HOME.x+90,y:SLING_HOME.y+10});assert.ok(backward.vx<0);
 const tiny=pullSling({x:SLING_HOME.x-.2,y:SLING_HOME.y});assert.ok(tiny.vx>0&&tiny.power<.01);
 const down=pullSling({x:SLING_HOME.x,y:SLING_HOME.y-100});assert.ok(down.vy>1000);
});
