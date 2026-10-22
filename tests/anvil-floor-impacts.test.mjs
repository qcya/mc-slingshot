import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {PixelGrid} from '../src/pixels.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js'),DT=1/120;
function fixture(){return new SiegeWorld(M,{grid:new PixelGrid(320,320)});}
function advance(w,seconds){for(let i=0;i<Math.ceil(seconds/DT);i++)w.step(DT);}
function until(w,f,seconds=6){for(let i=0;i<Math.ceil(seconds/DT)&&!f();i++)w.step(DT);assert.ok(f(),'expected actual Matter event');}

test('a continuous ground impact removes one 48px block and cannot rearm on the next touching layer',()=>{
 const w=fixture();w.grid.fill(60,100,80,140,3);w.synchronize();
 const p=w.spawnProjectile('anvil',300,180,0,400);until(w,()=>p.dead);
 for(let y=100;y<116;y++)for(let x=92;x<108;x++)assert.equal(w.grid.get(x,y),0,`whole block ${x},${y}`);
 for(let y=116;y<240;y++)for(let x=60;x<140;x++)assert.equal(w.grid.get(x,y),3,`deeper ground ${x},${y}`);
 assert.equal(w.grid.get(91,105),3);assert.equal(w.grid.get(108,105),3);
 assert.equal(w.stats.removed,256);assert.ok(Math.abs(p.body.bounds.max.y-348)<1);
});

test('three separated 48px floors each lose one block after natural falling across their air gaps',()=>{
 const w=fixture();for(const y of [100,150,200])w.grid.fill(60,y,80,16,3);w.grid.fill(0,260,320,16,7);w.synchronize();
 const p=w.spawnProjectile('anvil',300,180,0,400);let acceleratedGaps=0,prior=null;
 for(let i=0;i<1200&&!p.dead;i++){
  w.step(DT);const bottom=p.body.position.y+21;
  const gap=bottom>370&&bottom<420?1:bottom>520&&bottom<570?2:0;
  if(gap&&!p.plunging){if(prior?.gap===gap&&p.body.velocity.y>prior.v+.005)acceleratedGaps|=gap;prior={gap,v:p.body.velocity.y};}else prior=null;
 }
 assert.equal(p.dead,true);assert.equal(acceleratedGaps,3,'gravity accelerates in both gaps');
 for(const y of [100,150,200])for(let gy=y;gy<y+16;gy++)for(let gx=92;gx<108;gx++)assert.equal(w.grid.get(gx,gy),0,`floor block ${gx},${gy}`);
 assert.equal(w.stats.removed,768);assert.equal(w.grid.get(100,260),7);
});

test('a 48px wood debris floor is actually cut once and continuous stone beneath it remains intact',()=>{
 const w=fixture();w.grid.fill(0,116,320,180,3);w.synchronize();
 const d=w.addDebris(new Uint8Array(80*16).fill(4),80,16,{x:180,y:300});M.Body.setStatic(d.body,true);
 const p=w.spawnProjectile('anvil',300,180,0,400);until(w,()=>p.dead);
 assert.equal(w.debris.filter(e=>!e.dead).reduce((n,e)=>n+e.count,0),1024);
 for(let y=116;y<296;y++)assert.equal(w.grid.get(100,y),3,'touching stone is the same continuous floor');
 assert.equal(w.stats.removed,256);
});

test('falling alongside a wall does not spend a floor impact or carve the wall',()=>{
 const w=fixture();w.grid.fill(112,40,16,140,3);w.grid.fill(60,200,80,40,3);w.synchronize();
 const p=w.spawnProjectile('anvil',300,180,300,100);advance(w,3);
 for(let y=40;y<180;y++)for(let x=112;x<128;x++)assert.equal(w.grid.get(x,y),3);
 assert.ok(w.stats.removed>0);assert.equal(w.grid.get(100,216),3);
});

test('a descending staircase roof consumes one impact depth and keeps every pixel beyond the 48px footprint',()=>{
 const w=fixture();w.grid.fill(80,100,20,60,3);w.grid.fill(100,108,20,52,3);w.synchronize();
 const p=w.spawnProjectile('anvil',300,180,0,400);until(w,()=>p.dead);
 for(let y=100;y<116;y++)for(let x=92;x<100;x++)assert.equal(w.grid.get(x,y),0);
 for(let y=108;y<116;y++)for(let x=100;x<108;x++)assert.equal(w.grid.get(x,y),0);
 for(let y=116;y<160;y++)assert.equal(w.grid.get(100,y),3,'the next touching roof step must not rearm');
 for(let y=100;y<160;y++)assert.equal(w.grid.get(91,y),3);
 for(let y=108;y<160;y++)assert.equal(w.grid.get(108,y),3);
 assert.equal(w.stats.removed,192);assert.ok(Math.abs(p.body.bounds.max.y-348)<1);
});

test('one block-wide debris impact cannot restart from old sensor contacts on the remaining same debris',()=>{
 const w=fixture();w.grid.fill(0,160,320,16,7);w.synchronize();
 const d=w.addDebris(new Uint8Array(80*60).fill(4),80,60,{x:180,y:300});M.Body.setStatic(d.body,true);
 const p=w.spawnProjectile('anvil',300,180,0,400);until(w,()=>p.planted);const removed=w.stats.removed;
 advance(w,.4);
 assert.equal(w.stats.removed,256);assert.equal(w.stats.removed,removed);
 assert.ok(Math.abs(p.body.bounds.max.y-348)<1);
});

test('even a single pixel of air below a thin roof requires a new floor impact budget',()=>{
 const w=fixture();w.grid.fill(60,100,80,8,3);w.grid.fill(60,109,80,80,3);w.synchronize();
 const p=w.spawnProjectile('anvil',300,180,0,400);until(w,()=>p.dead);
 for(let y=109;y<125;y++)for(let x=92;x<108;x++)assert.equal(w.grid.get(x,y),0,'lower floor earns its own full block');
 assert.equal(w.grid.get(100,125),3);assert.equal(w.stats.removed,384);
 assert.ok(Math.abs(p.body.bounds.max.y-375)<1);
});

for(const material of [7,40])test(`a protected ${material} barrier within the impact block stops carving at its real surface`,()=>{
 const w=fixture();w.grid.fill(60,100,80,8,3);w.grid.fill(60,108,80,4,material);w.grid.fill(60,112,80,60,4);w.synchronize();
 const p=w.spawnProjectile('anvil',300,180,0,400);until(w,()=>p.dead);
 assert.ok(Math.abs(p.body.bounds.max.y-324)<1);
 for(let y=108;y<112;y++)assert.equal(w.grid.get(100,y),material);
 for(let y=112;y<172;y++)assert.equal(w.grid.get(100,y),4);
 assert.equal(w.stats.removed,128);
});
