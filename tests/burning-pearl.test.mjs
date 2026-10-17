import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PixelGrid,findSafeExit,circleClear} from '../src/pixels.mjs';
import {SiegeWorld} from '../src/world.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const advance=(w,n)=>{for(let i=0;i<n;i++)w.step(1/120);};
function fixture(){const grid=new PixelGrid(256,240);return new SiegeWorld(M,{grid,pixelSize:3});}
function fireContact(w,e){
 const p=w.spawnProjectile('fire',e.body.position.x-65,e.body.position.y,420,0);
 for(let i=0;i<50&&!p.dead;i++)w.step(1/120);
 assert.equal(p.dead,true,'real Matter contact consumes the charge');return p;
}

for(const skin of ['zombie','pillager','warden'])test(`${skin}: fire contact schedules exactly three timed ticks with no contact damage`,()=>{
 const w=fixture(),e=w.addEnemy(300,400,skin);M.Body.setStatic(e.body,true);
 fireContact(w,e);assert.equal(e.hp,skin==='warden'?300:100);
 assert.ok(e.burningUntil>w.time);assert.ok(w.active(),'pending burns keep the turn alive');
 const hp=[e.hp];let previous=e.hp;
 for(let i=0;i<300;i++){w.step(1/120);if(e.hp!==previous){hp.push(e.hp);previous=e.hp;}}
 assert.equal(hp.length,4,JSON.stringify(hp));
 for(let tick=0;tick<=3;tick++)assert.ok(Math.abs(hp[tick]-(skin==='warden'?300-tick*50:100-tick*100/3))<1e-8);
 assert.equal(e.alive,skin==='warden');assert.ok(Math.abs(e.hp-(skin==='warden'?150:0))<1e-8);
 assert.equal(w.active(),false,'an exhausted burn cannot prolong the turn');
 if(skin==='warden'){
  fireContact(w,e);assert.equal(e.hp,150);advance(w,300);
  assert.equal(e.alive,false);assert.ok(Math.abs(e.hp)<1e-8);
 }
});

test('second charge applies independently while the first charge and its burning wood remain active',()=>{
 const w=fixture(),e=w.addEnemy(300,400,'warden');M.Body.setStatic(e.body,true);
 const p=fireContact(w,e);w.rear.grid.tile(6,6,10);w.ignite(6*48+24,6*48+24,20,`ammo:${p.id}`);
 const second=fireContact(w,e);assert.notEqual(p.id,second.id);
 assert.equal(e.hp,300,'neither collision deals contact damage');advance(w,400);
 assert.equal(e.hp,0);assert.equal(e.alive,false);
 assert.equal(w.events.filter(v=>v.type==='hurt').length,6,'same-source wood never adds a seventh tick');
});

test('a single wood fire source cannot stack ticks across tiles or extend itself on a stationary enemy',()=>{
 const w=fixture();w.grid.fill(5*16,5*16,5*16,16,10);
 const e=w.addEnemy(7*48,6*48,'warden');M.Body.setStatic(e.body,true);
 assert.ok(w.ignite(7*48+24,5*48+24));advance(w,600);
 assert.equal(e.hp,150);assert.equal(e.alive,true);assert.equal(w.active(),false);
 assert.equal(w.events.filter(v=>v.type==='hurt').length,3);
 assert.ok(!w.events.some(v=>v.type==='fire'&&v.sound==='fire_ignite'));
});

for(const blocks of [2,3])for(const vy of [-450,0,450])test(`real Matter pearl contact: ${blocks} full blocks, vy=${vy}`,()=>{
 const w=fixture();w.grid.fill(100,0,blocks*16,220,5);w.synchronize();
 const before=w.grid.cells.slice(),hp=w.grid.hp.slice(),p=w.spawnProjectile('ender',220,300,900,vy);
 advance(w,35);assert.equal(w.stats.portals,blocks===2?1:0);
 assert.deepEqual(w.grid.cells,before);assert.deepEqual(w.grid.hp,hp);
 if(blocks===2)assert.ok(p.body.position.x>396+14,'whole pearl exits the full 96 pixel wall');
});

test('safe pearl exit measures two-block thickness independently of radius and ray angle',()=>{
 const wall=(x,y)=>x>=300&&x<396;
 for(const radius of [5,14,21])for(const slope of [-.5,0,.5])for(const offset of [-.7,.2,1.3]){
  const exit=findSafeExit(wall,{x:300-radius+offset,y:300},{x:1,y:slope},radius,96,1.5,{x:1,y:0});
  assert.ok(exit,`radius=${radius}, slope=${slope}, offset=${offset}`);
  assert.ok(circleClear(wall,exit.x,exit.y,radius,.5));
 }
 assert.equal(findSafeExit((x,y)=>x>=300&&x<444,{x:286,y:300},{x:1,y:.5},14,96,1.5,{x:1,y:0}),null);
 assert.equal(findSafeExit((x,y)=>(x>=300&&x<396)||(x>=410&&x<460),{x:286,y:300},{x:1,y:0},14,96,1.5,{x:1,y:0}),null);
});

test('pearl contact does not mistake a separate wall behind its body for the contacted wall',()=>{
 const sample=(x,y)=>(x>=260&&x<270)||(x>=300&&x<396);
 const exit=findSafeExit(sample,{x:286,y:300},{x:1,y:0},14,96,1.5,{x:1,y:0});
 assert.ok(exit);assert.ok(exit.x>=410);
});

test('a fire charge hitting a mobile grounded enemy still deals only its three timed burn hits',()=>{
 const w=fixture();w.grid.fill(0,134,256,40,7);w.synchronize();
 const e=w.addEnemy(300,402,'zombie',{stationary:true});advance(w,60);
 fireContact(w,e);assert.equal(e.hp,100);advance(w,300);
 assert.equal(e.hp,0);assert.equal(w.events.filter(v=>v.type==='hurt').length,3);
});
