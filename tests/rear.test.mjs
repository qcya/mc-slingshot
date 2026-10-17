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
test('楼板脱离时后墙进入同一残骸，不增加碰撞形状',()=>{
 const w=setup(),before=w.rear.grid.count();w.grid.fill(96,112,64,16,0);w.synchronize();
 const piece=w.debris.find(e=>e.backPixels.length);assert.ok(piece);assert.equal(piece.backPixels.length,before);assert.equal(w.rear.grid.count(),0);
 const pos=w.worldPoint(piece,piece.backPixels[0].x,piece.backPixels[0].y);for(let i=0;i<36;i++)w.step(1/120);
 const after=w.worldPoint(piece,piece.backPixels[0].x,piece.backPixels[0].y);assert.ok(after.y>pos.y);
});
