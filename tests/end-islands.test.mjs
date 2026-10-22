import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEnd} from '../src/levels-end.mjs';
import {createLevelBuilder} from '../src/level-builder.mjs';
import {SiegeWorld} from '../src/world.mjs';
import {createRequire} from 'node:module';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
test('every End island has void below it and only the final exit fountain contains bedrock',()=>{
 for(let n=0;n<10;n++){
  const s=buildEnd(n);
  for(const g of [s.grid,s.rear.grid])for(let y=17*16;y<18*16;y++)for(let x=0;x<512;x++)assert.equal(g.get(x,y),0,`End ${n+1}: basement must be air`);
  assert.ok(s.rear.grid.cells.every(m=>m!==7));
  for(let y=0;y<288;y++)for(let x=0;x<512;x++)if(s.grid.get(x,y)===7){
   const tx=Math.floor(x/16),ty=Math.floor(y/16);
   assert.ok(n===9&&(ty===15&&tx>=22&&tx<=28||ty===14&&[22,25,28].includes(tx)||[12,13].includes(ty)&&tx===25),`End ${n+1}: stray bedrock at ${tx},${ty}`);
  }
 }
 for(const dimension of ['overworld','nether','sift']){
  const s=createLevelBuilder(dimension).scene;
  for(const g of [s.grid,s.rear.grid])for(let x=0;x<512;x++)assert.equal(g.get(x,17*16+8),7,`${dimension}: retain original bedrock`);
 }
});
test('Dragon pylons are uninterrupted two-block rectangles with clear supported crystal and Shulker pairs',()=>{
 const s=buildEnd(9),world=new SiegeWorld(M,s);
 for(const [left,top,bottom] of [[18,6,15],[30,4,15]]){
  for(let y=top*16;y<(bottom+1)*16;y++)for(let x=left*16;x<(left+2)*16;x++)assert.equal(s.grid.get(x,y),40);
  for(let x=left*16;x<(left+2)*16;x++)assert.equal(s.grid.get(x,top*16-1),0);
  for(let y=top*16;y<(bottom+1)*16;y++)assert.notEqual(s.grid.get((left-1)*16+8,y),40,'no bent side cap');
 }
 for(let y=0;y<288;y++)for(let x=0;x<512;x++)if(s.grid.get(x,y)===40){const tx=Math.floor(x/16),ty=Math.floor(y/16);assert.ok([18,19].includes(tx)&&ty>=6&&ty<=15||[30,31].includes(tx)&&ty>=4&&ty<=15,'no overhangs outside the two rectangles');}
 for(const a of s.enemies)world.addEnemy(a.x,a.feet,a.skin,a);
 const dragon=world.enemies.find(e=>e.skin==='ender_dragon'),crystals=world.projectiles.filter(p=>p.healingOwner===dragon.id),shulkers=world.enemies.filter(e=>e.skin==='shulker');
 assert.equal(crystals.length,2);assert.deepEqual(crystals.map(p=>p.body.bounds.max.y),[6*48,4*48]);
 for(const p of crystals){for(let x=p.body.bounds.min.x+1;x<p.body.bounds.max.x;x++)assert.ok(world.sample(x,p.body.bounds.max.y+1),'full crystal footprint supported');for(const e of shulkers){const a=p.body.bounds,b=e.body.bounds;assert.ok(a.max.x<=b.min.x||a.min.x>=b.max.x||a.max.y<=b.min.y||a.min.y>=b.max.y);}}
 M.Events.off(world.engine);M.Composite.clear(world.engine.world,false);M.Engine.clear(world.engine);
});
