import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';import {RearLayer} from '../src/rear.mjs';import {SiegeWorld} from '../src/world.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function setup(){
 const grid=new PixelGrid(240,160);grid.fill(0,128,240,32,7);grid.fill(96,112,64,16,10);grid.fill(96,80,16,32,4);grid.fill(144,80,16,32,4);grid.fill(96,64,64,16,10);
 const rear=new RearLayer(240,160);rear.room(7,5,2,2,10,112,{x0:96,y0:64,x1:160,y1:128});
 return new SiegeWorld(M,{grid,rear,pixelSize:2});
}
test('普通撞击只伤前景，爆炸同时破坏可见后景',()=>{
 const w=setup(),before=w.rear.grid.count();
 w.damageDisk(242,210,18,500);assert.equal(w.rear.grid.count(),before);
 w.blast(242,210,22,500);assert.ok(w.rear.grid.count()<before);
});
test('楼板被移除时后墙仍留在原位置，不产生可运动房屋残骸',()=>{
 const w=setup(),before=w.rear.grid.count();w.grid.fill(96,112,64,16,0);w.synchronize();
 assert.equal(w.debris.length,0);assert.equal(w.rear.grid.count(),before);
 for(let i=0;i<120;i++)w.step(1/120);assert.equal(w.rear.grid.get(120,90),10);assert.equal(w.rear.grid.count(),before);
});
test('最后支点消失时也允许剩余前后景悬空固定',()=>{
 const grid=new PixelGrid(64,64);grid.fill(0,48,64,16,7);grid.fill(32,32,16,16,10);
 const rear=new RearLayer(64,64);rear.room(2,1,1,1,10,32,{x0:32,y0:16,x1:48,y1:48});
 const w=new SiegeWorld(M,{grid,rear,pixelSize:2});grid.fill(32,32,16,16,0);grid.set(40,32,10);w.synchronize();
 assert.equal(rear.grid.count(),256);assert.equal(w.grid.get(40,32),10);assert.equal(w.debris.length,0);
});
