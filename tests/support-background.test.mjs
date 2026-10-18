import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildLevel} from '../src/levels.mjs';
import {SiegeWorld} from '../src/world.mjs';
const Matter=createRequire(import.meta.url)('../vendor/matter.min.js');

test('burned outpost supports leave open air, with the upper building still floating',()=>{
  const scene=buildLevel(3),w=new SiegeWorld(Matter,{grid:scene.grid,rear:scene.rear});
  for(const x of [22,27]){
    for(let y=11;y<=13;y++)assert.equal(scene.rear.grid.get(x*16+8,y*16+8),0,'standalone supports must not have a background copy');
    assert.equal(w.ignite((x+.5)*48,12.5*48,3,`pillar:${x}`),true);
  }
  const roof=scene.grid.get(20*16+12,5*16+12),deck=scene.grid.get(24*16+8,10*16+8);
  for(let i=0;i<480;i++)w.step(1/120);
  for(const x of [22,27])for(let y=11;y<=13;y++){
    assert.equal(scene.grid.get(x*16+8,y*16+8),0);
    assert.equal(scene.rear.grid.get(x*16+8,y*16+8),0);
  }
  assert.ok(roof);assert.equal(scene.grid.get(20*16+12,5*16+12),roof);
  assert.equal(scene.grid.get(24*16+8,10*16+8),deck);
  assert.equal(w.debris.length,0);
});

test('the exposed quarry support has no freestanding rock pillar painted behind it',()=>{
  const scene=buildLevel(7);
  for(let y=8;y<14;y++)assert.equal(scene.rear.grid.get(29*16+8,y*16+8),0);
  assert.equal(scene.rear.grid.get(29*16+8,14*16+8),3,'continuous underground wall stays behind the mine');
});
