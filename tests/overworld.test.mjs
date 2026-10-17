import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {LEVELS,buildLevel} from '../src/levels.mjs';import {inventoryFor,totalAmmo} from '../src/campaign.mjs';
test('ten unique overworld plans have finite inventories, solid block terrain and clear mob spawns',()=>{
 const hashes=new Set();
 for(let index=0;index<10;index++){
  const scene=buildLevel(index);assert.equal(scene.number,index);assert.equal(scene.shots,totalAmmo(inventoryFor(index)));assert.ok(scene.shots<18);
  hashes.add(createHash('sha256').update(scene.grid.cells).digest('hex'));
  for(const e of scene.enemies){
   const halfWidth=e.skin==='warden'?29:16,top=e.feet-e.height;
   for(let y=top+1;y<e.feet-1;y+=3)for(let x=e.x-halfWidth+1;x<e.x+halfWidth-1;x+=3)assert.equal(scene.grid.get(x/3,y/3),0,`stage ${index+1} ${e.skin} overlaps terrain`);
   assert.ok(scene.grid.get(e.x/3,e.feet/3),`stage ${index+1} mob has no floor`);
  }
 }
 assert.equal(hashes.size,10);assert.equal(LEVELS.length,10);
 for(const index of [8,9])assert.ok(buildLevel(index).enemies.some(e=>e.skin==='warden'&&e.height===132));
 assert.equal(buildLevel(9).enemies.filter(e=>e.skin==='warden').length,2);
 assert.ok(buildLevel(9).enemies.length>buildLevel(8).enemies.length);
});
test('level selector clamps invalid indices while preserving the build contract',()=>{
 assert.equal(buildLevel(100).number,9);assert.equal(buildLevel(-1).number,0);assert.equal(buildLevel(NaN).number,0);
 const scene=buildLevel(9);assert.equal(scene.grid.width,512);assert.equal(scene.grid.height,288);assert.ok(scene.visual.roofTiles instanceof Set);assert.ok(scene.rear.grid);
});
