import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';
import {SiegeWorld} from '../src/world.mjs';
import {burnEnemy} from '../src/fire.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function fixture(){const grid=new PixelGrid(512,288);grid.fill(0,240,512,48,7);return new SiegeWorld(M,{grid});}
function step(w,t){for(let i=0;i<t*120;i++)w.step(1/120);}
function hit(w,e,kind){const p=w.spawnProjectile(kind,400,500,500,0);w.before=new Map([[p.body.id,{x:8,y:0}]]);w.processContact({bodyA:p.body,bodyB:e.body,collision:{normal:{x:1,y:0},supports:[{...e.body.position}]}});w.time+=.15;return p;}

test('a real flying snowball encases a moving target and the next real stone breaks ice',()=>{
 const w=fixture(),e=w.addEnemy(600,720,'hoglin');step(w,.2);
 const snow=w.spawnProjectile('snowball',450,e.body.position.y,600,0);step(w,.3);
 assert.equal(snow.dead,true);assert.equal(e.frozen,true);const x=e.body.position.x;
 step(w,6);assert.equal(e.body.position.x,x);assert.equal(e.hp,300);
 w.spawnProjectile('cobble',x-120,e.body.position.y,650,0);step(w,.3);
 assert.equal(e.frozen,false);assert.equal(e.hp,200);assert.equal(e.body.isStatic,false);
});

test('freezing a visibly open Shulker holds the vulnerable lid, and one stone still kills it',()=>{
 const w=fixture(),e=w.addEnemy(600,720,'shulker');
 for(let i=0;i<1000&&e.shellAmount<.8;i++)w.step(1/120);
 assert.ok(e.shellAmount>=.8);hit(w,e,'snowball');const open=e.shellAmount,pose={...e.pose};step(w,10);
 assert.equal(e.shellAmount,open);assert.deepEqual(e.pose,pose);hit(w,e,'cobble');
 assert.equal(e.alive,false);assert.equal(e.frozen,false);assert.equal(e.body.isStatic,false);
});

test('TNT breaks ice and keeps its normal damage and knockback',()=>{
 const w=fixture(),e=w.addEnemy(600,720,'hoglin');hit(w,e,'snowball');
 w.blast(e.body.position.x-30,e.body.position.y);assert.equal(e.frozen,false);assert.equal(e.hp,150);assert.ok(e.body.velocity.x>0);
});

test('fire and lava melt ice even on fire-immune piglins, without changing their immunity',()=>{
 const w=fixture(),e=w.addEnemy(600,720,'zombified_piglin');hit(w,e,'snowball');
 burnEnemy(w,e,'fire:one');assert.equal(e.frozen,false);assert.equal(e.hp,100);assert.equal(e.burnTicks.length,0);
 hit(w,e,'snowball');w.lava.sources.push({x:48,y:56,id:1,active:true});step(w,.3);
 assert.equal(e.frozen,false);assert.equal(e.hp,100);
});

test('snow puts out existing burn ticks and repeated snow does not lose original physics mass',()=>{
 const w=fixture(),e=w.addEnemy(600,720,'hoglin');burnEnemy(w,e,'fire:one');hit(w,e,'snowball');hit(w,e,'snowball');step(w,6);
 assert.equal(e.hp,300);assert.equal(e.burningUntil,0);hit(w,e,'cobble');assert.equal(e.body.mass,3.6);assert.equal(e.hp,200);
});
