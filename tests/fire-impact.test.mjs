import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';
import {SiegeWorld} from '../src/world.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const advance=(w,seconds)=>{for(let i=0;i<seconds*120;i++)w.step(1/120);};
function fixture(){const w=new SiegeWorld(M,{grid:new PixelGrid(256,240),pixelSize:3});w.engine.gravity.y=0;return w;}
function shoot(w,x,y,vx,vy){w.synchronize();const p=w.spawnProjectile('fire',x,y,vx,vy);for(let i=0;i<120&&!p.dead;i++)w.step(1/120);assert.ok(p.dead,'charge reaches the surface');return p;}

for(const [name,start,velocity,center] of [
 ['left',[220,264],[420,0],[5,5]],
 ['right',[405,264],[-420,0],[7,5]],
 ['top',[312,165],[0,420],[6,4]],
 ['bottom',[312,360],[0,-420],[6,6]],
])test(`nonwood impact from ${name} leaves a surface-centered five-tile flame footprint`,()=>{
 const w=fixture();w.grid.tile(6,5,6);const pixels=w.grid.cells.slice(),hp=w.grid.hp.slice();
 shoot(w,...start,...velocity);
 assert.equal(w.fires.length,5,'persistent flames exist even with no wood');
 const [x,y]=center;
 assert.deepEqual(new Set(w.fires.map(f=>`${f.tx}:${f.ty}`)),new Set([`${x}:${y}`,`${x-1}:${y}`,`${x+1}:${y}`,`${x}:${y-1}`,`${x}:${y+1}`]));
 advance(w,4);assert.deepEqual(w.grid.cells,pixels);assert.deepEqual(w.grid.hp,hp);assert.equal(w.fires.length,0);
});

for(const material of [2,3,6])test(`ground impact on material ${material} leaves flames above the intact surface`,()=>{
 const w=fixture();w.grid.fill(2*16,6*16,8*16,16,material);const pixels=w.grid.cells.slice(),hp=w.grid.hp.slice();
 shoot(w,264,180,0,420);
 assert.ok(w.fires.some(f=>f.tx===5&&f.ty===5),'center rests in empty air above the struck ground tile');
 advance(w,4);assert.deepEqual(w.grid.cells,pixels);assert.deepEqual(w.grid.hp,hp);
});

test('glass impact burns only the wooden floor tile touched by its local footprint',()=>{
 const w=fixture();w.grid.tile(6,5,6);w.grid.fill(16,6*16,9*16,16,10);
 shoot(w,220,270,420,0);advance(w,4);
 assert.equal(w.grid.get(5*16+8,6*16+8),0,'floor directly beneath the ignition center burns');
 for(const tx of [1,2,3,4,6,7,8,9])assert.equal(w.grid.get(tx*16+8,6*16+8),10,`untouched connected floor ${tx} survives`);
 assert.equal(w.grid.get(6*16+8,5*16+8),6);
});

for(const skin of ['zombie','warden'])test(`${skin} entering a lingering mineral-impact flame receives exactly one three-tick burn`,()=>{
 const w=fixture();w.grid.tile(6,5,3);shoot(w,220,264,420,0);
 advance(w,.4);const e=w.addEnemy(120,400,skin);M.Body.setStatic(e.body,true);
 M.Body.setPosition(e.body,{x:264,y:264});w.step(1/120);
 assert.equal(e.burnTicks.length,3);assert.equal(e.hp,skin==='warden'?300:100);
 advance(w,4);
 assert.equal(e.hp,skin==='warden'?150:0);assert.equal(e.alive,skin==='warden');
 assert.equal(w.events.filter(v=>v.type==='hurt').length,3,'overlapping flame tiles never stack one charge');
});

test('a nonwood foreground contact cannot ignite a rear wood cluster through the struck wall',()=>{
 const w=fixture();w.grid.tile(6,5,6);w.rear.grid.fill(6*16,4*16,4*16,3*16,10);
 shoot(w,220,264,420,0);advance(w,4);
 assert.equal(w.rear.grid.get(8*16+8,5*16+8),10,'rear wood beyond the local plus survives');
 assert.equal(w.grid.get(6*16+8,5*16+8),6);
});

test('stone debris contact also leaves a local flame instead of igniting a rear wood cluster',()=>{
 const w=fixture(),mask=new Uint8Array(16*16).fill(3);
 const debris=w.addDebris(mask,16,16,{x:288,y:240});M.Body.setStatic(debris.body,true);
 w.rear.grid.fill(6*16,5*16,4*16,16,10);
 shoot(w,220,264,420,0);advance(w,4);
 assert.equal(w.rear.grid.get(8*16+8,5*16+8),10,'rear wood beyond the local footprint survives');
 assert.ok(debris.mask.every(m=>m===3));
});

test('a direct wooden impact retains connected burning within two tiles of the struck seed',()=>{
 const w=fixture();w.grid.fill(6*16,5*16,5*16,16,10);w.grid.tile(6,4,4);w.grid.tile(6,6,4);
 shoot(w,220,264,420,0);advance(w,4);
 for(const [tx,ty] of [[6,5],[7,5],[8,5],[6,4],[6,6]])assert.equal(w.grid.get(tx*16+8,ty*16+8),0);
 for(const tx of [9,10])assert.equal(w.grid.get(tx*16+8,5*16+8),10,'wood beyond radius two survives');
});
