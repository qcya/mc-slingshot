import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {buildLevel,levelsFor,LEVELS} from '../src/levels.mjs';
import {MATERIALS,TILE} from '../src/config.mjs';
import {SiegeWorld} from '../src/world.mjs';
const Matter=createRequire(import.meta.url)('../vendor/matter.min.js');
const originals=[
 [['pillager',23,13]],
 [['pillager',25.5,4],['pillager',26,9],['zombie',25.5,13]],
 [['pillager',22,10],['pillager',27,10],['zombie',23,16],['zombie',27,13]],
 [['pillager',23.7,10],['pillager',26.2,10],['pillager',29.4,10,true],['zombie',24.5,14]],
 [['pillager',20.5,6,true],['pillager',29.5,6,true],['pillager',25,10],['zombie',24,13],['zombie',26,13]],
 [['zombie',20,13],['pillager',22.5,13],['pillager',26,9],['zombie',29,14],['pillager',27.5,9]],
 [['pillager',23.5,9],['pillager',26,9],['zombie',20.5,16],['zombie',24.5,16],['pillager',28.5,13,true]],
 [['pillager',19.5,10],['pillager',26,7],['pillager',29,7],['pillager',25,13],['zombie',21,16],['zombie',27,16]],
 [['pillager',21.5,7],['pillager',27,9],['zombie',20,16],['warden',24.5,16],['pillager',28.5,16]],
 [['pillager',19.5,6,true],['pillager',29.5,6,true],['pillager',24.5,12],['zombie',25.5,12],['pillager',21.5,16],['warden',22.5,16],['warden',27.5,16],['pillager',28.5,16]]
];
const width=e=>e.skin==='hoglin'?90:e.skin==='warden'?58:e.skin==='shulker'?48:32;
function standingClear(scene,x,feet,w,h){
 for(let py=feet-h+1;py<feet-1;py+=3)for(let px=x-w/2+1;px<x+w/2-1;px+=3)assert.equal(scene.grid.get(px/3,py/3),0,`${scene.dimension} ${scene.number+1}: body overlaps ${px},${py}`);
 assert.ok(scene.grid.get((x-w*.3)/3,feet/3));assert.ok(scene.grid.get((x+w*.3)/3,feet/3));
}

test('rebuilt overworld retains every original species, count, location and stationary sentry',()=>{
 assert.equal(LEVELS,levelsFor());
 for(let i=0;i<10;i++)assert.deepEqual(buildLevel(i).enemies.map(e=>[e.skin,e.x,e.feet,...(e.stationary?[true]:[])]),originals[i].map(([skin,x,y,...rest])=>[skin,x*TILE,y*TILE,...rest]));
});

test('thirty separate architectural maps use true block collision and clear initial standing surfaces',()=>{
 const hashes=new Set();
 for(const dimension of ['overworld','nether','end']){
  assert.equal(levelsFor(dimension).length,10);
  for(let n=0;n<10;n++){
   const s=buildLevel(n,dimension);assert.equal(s.dimension,dimension);assert.equal(s.number,n);assert.ok(s.shots>0);
   hashes.add(createHash('sha256').update(s.grid.cells).digest('hex'));
   assert.ok(s.grid.cells.every(m=>![19,20,21].includes(m)),'furniture is not a collider');
   assert.ok(s.rear.grid.cells.every(m=>![6,9,17,18,22,23].includes(m)),'rear walls have no windows, doors or ore');
   for(const e of s.enemies)standingClear(s,e.x,e.feet,width(e),e.height);
   for(let ty=0;ty<18;ty++)for(let tx=0;tx<32;tx++){
    const step=s.visual.roofTiles.has(ty*32+tx)?8:16;
    for(let qy=0;qy<16;qy+=step)for(let qx=0;qx<16;qx+=step){const m=s.grid.get(tx*16+qx,ty*16+qy);for(let y=0;y<step;y++)for(let x=0;x<step;x++)assert.equal(s.grid.get(tx*16+qx+x,ty*16+qy+y),m);}
   }
  }
 }
 assert.equal(hashes.size,30);
});

test('new dimension actors stay alive on the untouched map and overworld zombies remain shaded',()=>{
 for(const dimension of ['overworld','nether','end'])for(let n=0;n<10;n++){
  const s=buildLevel(n,dimension),world=new SiegeWorld(Matter,s),count=s.grid.count();
  for(const e of s.enemies)world.addEnemy(e.x,e.feet,e.skin,e);
  try{
   for(let tick=0;tick<600;tick++){
    world.step(1/120);world.events.length=0;
    if(tick%60===0)for(const e of world.enemies)if(e.skin==='zombie'){
     const x=e.body.position.x/3,top=(e.body.position.y-e.dimensions.height/2)/3;
     assert.ok(Array.from({length:Math.max(0,Math.floor(top))},(_,y)=>s.grid.get(x,y)).some(m=>m&&m!==6),`overworld ${n+1}: exposed zombie patrol`);
    }
   }
   assert.equal(world.enemies.filter(e=>e.alive).length,s.enemies.length,`${dimension} ${n+1}`);
   assert.equal(world.debris.length,0);assert.equal(s.grid.count(),count);
  }finally{Matter.Events.off(world.engine);Matter.Composite.clear(world.engine.world,false);Matter.Engine.clear(world.engine);}
 }
});

test('endermen have at least four full-height, supported teleport destinations',()=>{
 for(let n=0;n<10;n++){
  const s=buildLevel(n,'end');
  for(const e of s.enemies.filter(e=>e.skin==='enderman')){
   assert.ok(e.teleportSpots.length>=4);
   for(const p of e.teleportSpots){standingClear(s,p.x,p.feet,32,132);assert.ok(p.x>400&&p.x<1500);}
  }
 }
});

test('nether lava sources start in empty cells away from initial targets',()=>{
 for(let n=0;n<10;n++){
  const s=buildLevel(n,'nether');assert.ok(s.lavaSources.length);
  for(const p of s.lavaSources){assert.equal(s.grid.get(p.x*16+8,p.y*16+8),0);if(!p.flowing)assert.ok(s.grid.get(p.x*16+8,(p.y+1)*16));assert.ok(s.enemies.every(e=>Math.abs(e.x-(p.x+.5)*TILE)>TILE));}
 }
});

test('dimension block material files preserve original static and animated PNG dimensions',()=>{
 for(let id=24;id<=40;id++){
  const png=fs.readFileSync(new URL(`../assets/textures/${MATERIALS[id].sprite}.png`,import.meta.url));
  assert.equal(png.readUInt32BE(16),16);assert.equal(png.readUInt32BE(20),[33,34].includes(id)?80:16);
 }
});

test('at least three Nether maps have elevated lava falls that visibly descend',()=>{
 let falls=0;for(let n=0;n<10;n++){const s=buildLevel(n,'nether');if(!s.lavaSources.some(p=>p.flowing&&p.y<10))continue;falls++;const w=new SiegeWorld(Matter,s);try{for(let i=0;i<180;i++)w.step(1/120);for(const p of s.lavaSources.filter(p=>p.flowing))assert.ok([...w.lava.cells.values()].some(c=>c.y>=(p.y+2)*TILE),'flow reaches below the elevated source');}finally{Matter.Events.off(w.engine);Matter.Composite.clear(w.engine.world,false);Matter.Engine.clear(w.engine);}}assert.ok(falls>=3);
});
