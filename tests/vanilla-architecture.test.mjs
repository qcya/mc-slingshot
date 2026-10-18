import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLevel} from '../src/levels.mjs';
import {buildTitleScene} from '../src/title-scene.mjs';

test('the first cottage is occupied by a pillager, with real glass in its front wall',()=>{
  const s=buildLevel(0);
  assert.deepEqual(s.enemies.map(e=>e.skin),['pillager']);
  for(let dy=0;dy<16;dy++)for(let dx=0;dx<16;dx++)assert.equal(s.grid.get(20*16+dx,11*16+dy),6);
});

test('roof steps are actual collision shapes, using Minecraft half-block quadrants',()=>{
  const s=buildLevel(0),g=s.grid;
  assert.equal(g.get(19*16,9*16),0,'empty half of the ascending stair is physically empty');
  assert.equal(g.get(19*16+8,9*16),15);
  assert.equal(g.get(19*16,9*16+8),15);
  assert.equal(g.get(29*16+8,9*16),0,'descending stair mirrors the ascending stair');
  assert.equal(g.get(29*16,9*16),15);
});

test('all scene materials are real blocks, without a separate cosmetic material map',()=>{
  for(const s of [...Array.from({length:10},(_,i)=>buildLevel(i)),buildTitleScene()]){
    assert.equal(s.visual.facings,undefined);
    assert.equal(s.visual.rearPaint,undefined);
  }
});

test('cottage and title roofs have a low pitch while retaining connected half-block steps',()=>{
  for(const [scene,left,right,top,bottom] of [[buildLevel(0),19,29,7,10],[buildTitleScene(),21,29,7.5,10]]){
    const g=scene.grid;
    let minY=Infinity;
    for(let y=0;y<bottom*16;y++)for(let x=left*16;x<(right+1)*16;x++)if(g.get(x,y)===15)minY=Math.min(minY,y);
    assert.equal(minY,top*16,'gable height must stay proportional to the three-block wall');
    // The roof still bears on the original wall columns at the same eave height.
    for(const x of [left+1,right-1])for(let px=0;px<16;px++)assert.equal(g.get(x*16+px,bottom*16-1),15);
    assert.equal(g.get((left+2)*16+4,9*16+4),0,'do not retain the old full block beneath every inner stair');
  }
});
