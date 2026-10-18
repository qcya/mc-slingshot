import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';
import {SiegeWorld} from '../src/world.mjs';
import {igniteImpact} from '../src/fire.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const advance=(w,seconds)=>{for(let i=0;i<seconds*120;i++)w.step(1/120);};
function fixture(){const w=new SiegeWorld(M,{grid:new PixelGrid(256,240),pixelSize:3});w.engine.gravity.y=0;return w;}
function shoot(w,x,y,vx,vy){w.synchronize();const p=w.spawnProjectile('fire',x,y,vx,vy);for(let i=0;i<120&&!p.dead;i++)w.step(1/120);assert.ok(p.dead,'charge reaches the surface');return p;}

for(const [name,start,velocity] of [
 ['left',[220,264],[420,0]],
 ['right',[405,264],[-420,0]],
 ['bottom',[312,360],[0,-420]],
])test(`nonwood wall or ceiling impact from ${name} creates no flames`,()=>{
 const w=fixture();w.grid.tile(6,5,3);const pixels=w.grid.cells.slice(),hp=w.grid.hp.slice();
 shoot(w,...start,...velocity);
 assert.equal(w.fires.length,0);
 advance(w,4);assert.deepEqual(w.grid.cells,pixels);assert.deepEqual(w.grid.hp,hp);assert.equal(w.fires.length,0);
});

for(const material of [2,3,6])test(`ground impact on material ${material} leaves flames above the intact surface`,()=>{
 const w=fixture();w.grid.fill(2*16,6*16,8*16,16,material);const pixels=w.grid.cells.slice(),hp=w.grid.hp.slice();
 shoot(w,264,180,0,420);
 assert.deepEqual(new Set(w.fires.map(f=>`${f.tx}:${f.ty}`)),new Set(['4:5','5:5','6:5']));
 advance(w,4);assert.deepEqual(w.grid.cells,pixels);assert.deepEqual(w.grid.hp,hp);
});

test('a glass wall impact does not create fire or ignite the nearby wooden floor',()=>{
 const w=fixture();w.grid.tile(6,5,6);w.grid.fill(16,6*16,9*16,16,10);
 shoot(w,220,270,420,0);advance(w,4);
 assert.equal(w.fires.length,0);
 for(const tx of [1,2,3,4,5,6,7,8,9])assert.equal(w.grid.get(tx*16+8,6*16+8),10,`floor ${tx} survives`);
 assert.equal(w.grid.get(6*16+8,5*16+8),6);
});

for(const skin of ['zombie','warden'])test(`${skin} entering a lingering mineral-impact flame receives exactly one three-tick burn`,()=>{
 const w=fixture();w.grid.fill(3*16,6*16,6*16,16,3);shoot(w,264,180,0,420);
 advance(w,.4);const e=w.addEnemy(120,400,skin);M.Body.setStatic(e.body,true);
 M.Body.setPosition(e.body,{x:264,y:264});w.step(1/120);
 assert.equal(e.burnTicks.length,3);assert.equal(e.hp,skin==='warden'?300:100);
 advance(w,4);
 assert.equal(e.hp,skin==='warden'?150:0);assert.equal(e.alive,skin==='warden');
 assert.equal(w.events.filter(v=>v.type==='hurt').length,3,'overlapping flame tiles never stack one charge');
});

test('a nonwood foreground contact cannot ignite a rear wood cluster through the struck wall',()=>{
 const w=fixture();w.grid.tile(6,5,6);w.rear.grid.fill(6*16,4*16,4*16,3*16,10);
 const rear=w.rear.grid.cells.slice(),hp=w.rear.grid.hp.slice();
 shoot(w,220,264,420,0);advance(w,4);
 assert.deepEqual(w.rear.grid.cells,rear);assert.deepEqual(w.rear.grid.hp,hp);
 assert.equal(w.grid.get(6*16+8,5*16+8),6);
});

test('stone debris side contact does not create a flame or ignite rear wood',()=>{
 const w=fixture(),mask=new Uint8Array(16*16).fill(3);
 const debris=w.addDebris(mask,16,16,{x:288,y:240});M.Body.setStatic(debris.body,true);
 w.rear.grid.fill(6*16,5*16,4*16,16,10);
 const rear=w.rear.grid.cells.slice(),hp=w.rear.grid.hp.slice();
 shoot(w,220,264,420,0);advance(w,4);
 assert.deepEqual(w.rear.grid.cells,rear);assert.deepEqual(w.rear.grid.hp,hp);
 assert.equal(w.fires.length,0);
 assert.ok(debris.mask.every(m=>m===3));
});

test('a direct wooden impact burns only its seed and cardinal wooden neighbors',()=>{
 const w=fixture();w.grid.fill(6*16,5*16,5*16,16,10);w.grid.tile(6,4,4);w.grid.tile(6,6,4);
 shoot(w,220,264,420,0);advance(w,4);
 for(const [tx,ty] of [[6,5],[7,5],[6,4],[6,6]])assert.equal(w.grid.get(tx*16+8,ty*16+8),0);
 for(const tx of [8,9,10])assert.equal(w.grid.get(tx*16+8,5*16+8),10,'wood beyond the five-cell footprint survives');
});

test('ground flames skip unsupported air and disappear if their floor is destroyed',()=>{
 const w=fixture();w.grid.tile(5,6,3);shoot(w,264,180,0,420);
 assert.deepEqual(w.fires.map(f=>[f.tx,f.ty]),[[5,5]],'no floating side or vertical flames');
 w.damageDisk(264,312,40,500);w.step(1/120);
 assert.equal(w.fires.length,0);
});

test('wood ignition does not create flames in mineral or isolated empty neighbor cells',()=>{
 const w=fixture();w.grid.tile(5,5,10);w.grid.tile(6,5,3);w.grid.tile(5,6,6);
 assert.ok(w.ignite(264,264));
 assert.deepEqual(w.fires.map(f=>[f.tx,f.ty]),[[5,5]]);
});

test('an existing ground flame cannot suppress a later direct wooden ignition',()=>{
 const w=fixture();w.grid.fill(64,96,48,16,3);w.grid.fill(80,80,8,8,10);
 igniteImpact(w,216,288,{x:0,y:-1},'ground');
 assert.ok(w.fires.some(f=>f.tx===5&&f.ty===5&&f.surfaceY!==null));
 assert.ok(w.ignite(252,252,3,'wood'));
 advance(w,4);assert.equal(w.grid.get(84,84),0);
});
