import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildLevel} from '../src/levels.mjs';
import {SiegeWorld} from '../src/world.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');

test('all ten stages keep appliances in a noncolliding rear layer',()=>{
 let furniture=0;
 for(let level=0;level<10;level++){
  const scene=buildLevel(level),w=new SiegeWorld(M,scene),g=scene.rear.grid;
  assert.ok(scene.grid.cells.every(m=>![19,20,21].includes(m)),`stage ${level+1}`);
  for(let y=0;y<g.height;y+=16)for(let x=0;x<g.width;x+=16)if([19,20,21].includes(g.get(x,y))){
   furniture++;assert.equal(w.sample((x+8)*3,(y+8)*3),0,`decoration at stage ${level+1}, ${x}:${y}`);
  }
 }
 assert.ok(furniture>=20,'decorations remain visible throughout the campaign');
});

test('ordinary stone and a direct fire charge do not hit background furniture',()=>{
 const scene=buildLevel(0),w=new SiegeWorld(M,scene),g=scene.rear.grid;
 for(const m of [19,20,21]){
  const k=g.cells.indexOf(m),x=(k%g.width+8)*3,y=(Math.floor(k/g.width)+8)*3;
  assert.ok(k>=0);const before=g.cells.slice();
  w.damageDisk(x,y,12,500);assert.deepEqual(g.cells,before);
  assert.equal(w.ignite(x,y,6),false);
 }
});
