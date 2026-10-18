import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLevel} from '../src/levels.mjs';
import {buildTitleScene} from '../src/title-scene.mjs';

test('the first cottage is occupied by a pillager, with full aligned glass windows',()=>{
  const s=buildLevel(0);
  assert.deepEqual(s.enemies.map(e=>e.skin),['pillager']);
  for(const x of [22,26])for(let dy=0;dy<16;dy++)for(let dx=0;dx<16;dx++)
    assert.equal(s.rear.grid.get(x*16+dx,11*16+dy),6);
});

test('roof steps are actual collision shapes, using Minecraft half-block quadrants',()=>{
  const s=buildLevel(0),g=s.grid;
  assert.equal(g.get(19*16,9*16),0,'empty half of the ascending stair is physically empty');
  assert.equal(g.get(19*16+8,9*16),10);
  assert.equal(g.get(19*16,9*16+8),10);
  assert.equal(g.get(29*16+8,9*16),0,'descending stair mirrors the ascending stair');
  assert.equal(g.get(29*16,9*16),10);
});

test('all scene materials are real blocks, without a separate cosmetic material map',()=>{
  for(const s of [...Array.from({length:10},(_,i)=>buildLevel(i)),buildTitleScene()]){
    assert.equal(s.visual.facings,undefined);
    assert.equal(s.visual.rearPaint,undefined);
  }
});
