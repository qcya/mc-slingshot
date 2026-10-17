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


test('the final siege preserves its accepted geometry, thirteen shots, and safe cap sentries',()=>{
 const scene=buildLevel(9);
 assert.deepEqual(inventoryFor(9),[4,6,2,1]);assert.equal(scene.shots,13);
 assert.equal(createHash('sha256').update(scene.grid.cells).digest('hex'),'97dba26058575513744215b324de86790b07eda2b32b94c949e9ce93e678f0d1');
 assert.equal(createHash('sha256').update(scene.rear.grid.cells).digest('hex'),'b3c8e6a9dc51d9154ad555373ea212b570a5e1b8c404c6c5a65e58a9f84c1eb4');
 assert.deepEqual(scene.enemies.slice(0,2).map(e=>({x:e.x,feet:e.feet,stationary:e.stationary})),[
  {x:19.5*48,feet:6*48,stationary:true},{x:29.5*48,feet:6*48,stationary:true}
 ]);
 assert.ok(scene.enemies.slice(2).every(e=>!e.stationary),'wide rooms retain their normal patrols');
});

test('timber shelters and quarry ledges have visible full-block supports',()=>{
 const at=(scene,x,y)=>scene.grid.get(x*16,y*16);
 const loading=buildLevel(5);
 for(let x=25;x<=30;x++)assert.equal(at(loading,x,9),15,'loading shelter roof must be continuous');
 for(const x of [25,30])for(let y=10;y<=13;y++)assert.equal(at(loading,x,y),14,'log post reaches its ground');
 const bridge=buildLevel(6);
 assert.ok(bridge.visual.roofTiles.size>0,'bridge booth has a pitched roof');
 const quarry=buildLevel(7);
 for(let y=11;y<=13;y++)assert.equal(at(quarry,18,y),5,'entrance pier carries the loading ledge');
 for(let y=8;y<=15;y++)assert.equal(at(quarry,29,y),3,'quarry face carries its high ledge');
 const cave=buildLevel(8);for(const x of [20,24])assert.equal(at(cave,x,8),5,'lookout has both piers');
});
