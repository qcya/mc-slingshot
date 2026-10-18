import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';
import {SiegeWorld} from '../src/world.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function fixture(){return new SiegeWorld(M,{grid:new PixelGrid(96,96),pixelSize:3});}

test('ordinary damage clears only rear pixels behind genuinely removed foreground',()=>{
 const w=fixture();w.grid.tile(2,2,10);w.rear.grid.fill(16,16,64,64,5);
 const before=w.grid.cells.slice(),rear=w.rear.grid.cells.slice();
 w.damageDisk(120,120,30,500,{budget:17});
 let cleared=0;
 for(let k=0;k<before.length;k++){
  const removed=before[k]&&!w.grid.cells[k];
  assert.equal(w.rear.grid.cells[k],removed?0:rear[k],`pixel ${k}`);
  if(removed)cleared++;
 }
 assert.equal(cleared,17);assert.equal(w.stats.backgroundRemoved,17);
});

test('nonlethal hits do not clear background or harm exposed rear pixels',()=>{
 const w=fixture();w.grid.tile(2,2,5);w.rear.grid.fill(16,16,64,64,10);
 const rear=w.rear.grid.cells.slice(),hp=w.rear.grid.hp.slice();
 w.damageDisk(120,120,30,1);w.damageDisk(60,60,15,500,{background:true});
 assert.deepEqual(w.rear.grid.cells,rear);assert.deepEqual(w.rear.grid.hp,hp);
});

test('glass shattering clears its matching rear footprint and preserves neighboring wall',()=>{
 const w=fixture();w.grid.tile(2,2,6);w.rear.grid.fill(16,16,64,64,5);w.synchronize();
 const body=[...w.staticTiles.values()].flat().find(b=>b.plugin.glass);
 assert.ok(body);w.shatterGlass(body,{x:120,y:120},400);
 assert.equal(w.stats.backgroundRemoved,256);
 assert.equal(w.rear.grid.get(40,40),0);assert.equal(w.rear.grid.get(31,40),5);
});

test('burning wood removes even nonflammable rear only behind each erased pixel',()=>{
 const w=fixture();w.grid.tile(2,2,10);w.rear.grid.fill(16,16,64,64,5);
 assert.ok(w.ignite(120,120));
 for(let i=0;i<480;i++)w.step(1/120);
 assert.equal(w.grid.get(40,40),0);assert.equal(w.rear.grid.get(40,40),0);
 assert.equal(w.stats.backgroundRemoved,256);assert.equal(w.rear.grid.get(31,40),5);
});

test('TNT destroys exposed rear without giving it collision',()=>{
 const w=fixture();w.rear.grid.tile(2,2,10);
 assert.equal(w.sample(120,120),0);w.blast(120,120,30,160);
 assert.ok(w.stats.backgroundRemoved>0);assert.equal(w.rear.grid.get(40,40),0);
 assert.equal(w.grid.count(),0);assert.equal(w.staticTiles.size,0);
});

test('a front wall that survives a blast still protects its covered rear wall',()=>{
 const w=fixture();w.grid.tile(2,2,11);w.rear.grid.tile(2,2,10);
 const rear=w.rear.grid.cells.slice(),hp=w.rear.grid.hp.slice();
 w.blast(120,120,25,30);
 assert.equal(w.stats.removed,0);assert.equal(w.stats.backgroundRemoved,0);
 assert.deepEqual(w.rear.grid.cells,rear);assert.deepEqual(w.rear.grid.hp,hp);
});

test('blast removes matching rear even when that rear would withstand its own blast damage',()=>{
 const w=fixture();w.grid.tile(2,2,6);w.rear.grid.tile(2,2,5);
 w.blast(120,120,25,30);
 assert.ok(w.stats.removed>0);assert.ok(w.rear.grid.count()>0);
 for(let y=32;y<48;y++)for(let x=32;x<48;x++)if(!w.grid.get(x,y))assert.equal(w.rear.grid.get(x,y),0);
 assert.equal(w.debris.length,0);
});
