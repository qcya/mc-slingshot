import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLevel} from '../src/levels.mjs';
import {buildTitleScene} from '../src/title-scene.mjs';
import {components} from '../src/pixels.mjs';
import {rearPixel,foregroundPixel} from '../src/scenery.mjs';

test('background contains only wall materials, never windows, doors or furniture',()=>{
  for(const scene of [...Array.from({length:10},(_,i)=>buildLevel(i)),buildTitleScene()]){
    const allowed=new Set([0,2,3,4,5,7,10,11,12,13,14,15,16]);
    assert.ok(scene.rear.grid.cells.every(m=>allowed.has(m)),`stage ${scene.number+1} has interactive objects in its background`);
  }
});

test('the cottage appliances are solid blocks with actual collision space',()=>{
  const s=buildLevel(0);
  for(const material of [19,20,21])assert.ok(s.grid.cells.includes(material),`furniture ${material} must be solid`);
});

test('the roof is one joined block structure rather than corner-touching stair fragments',()=>{
  const s=buildLevel(0),g=s.grid,roof=new Uint8Array(g.cells.length);
  for(let y=0;y<10*16;y++)for(let x=19*16;x<30*16;x++)roof[y*g.width+x]=g.get(x,y);
  assert.equal(components(roof,g.width,g.height).length,1);
});

test('solid roof blocks keep normal brightness while the background wall stays dark',()=>{
  const s=buildLevel(0),assets={pixel:()=>[100,100,100,255],averages:{oak_planks:[100,100,100]}};
  assert.equal(rearPixel(assets,10,24*16+8,11*16+8,{},s.visual)[0],42);
  assert.equal(foregroundPixel(assets,15,19*16+10,9*16+10,s.grid,s.visual)[0],100);
});
