import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {PixelGrid} from '../src/pixels.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
test('obsidian and bedrock survive unlimited material damage with their hardness intact',()=>{
 const grid=new PixelGrid(32,32);grid.fill(0,0,16,32,40);grid.fill(16,0,16,32,7);
 const cells=grid.cells.slice();grid.damageDisk(16,16,100,Infinity);
 assert.deepEqual(grid.cells,cells);assert.ok([...grid.hp].every(h=>h===Infinity));
});
test('an outbound trident damages only glass while a real stone wall remains unchanged',()=>{
 const grid=new PixelGrid(512,288);grid.fill(120,0,16,180,3);
 const w=new SiegeWorld(M,{grid});w.engine.gravity.y=0;
 const cells=grid.cells.slice(),hp=grid.hp.slice();w.spawnProjectile('trident',200,240,1000,0);
 for(let i=0;i<60;i++)w.step(1/120);
 assert.deepEqual(grid.cells,cells);assert.deepEqual(grid.hp,hp);
});
test('an outbound trident passes the first glass contact without bouncing',()=>{
 const grid=new PixelGrid(512,288);grid.fill(120,0,16,180,6);
 const w=new SiegeWorld(M,{grid});w.engine.gravity.y=0;
 const p=w.spawnProjectile('trident',200,240,1000,0);
 for(let i=0;i<48;i++){w.step(1/120);assert.ok(p.body.velocity.x>0);}
 assert.ok(p.body.position.x>408);assert.ok(w.stats.removed>0);assert.notEqual(p.returning,true);
});
