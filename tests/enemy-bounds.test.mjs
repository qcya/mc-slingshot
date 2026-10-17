import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
for(const skin of ['zombie','pillager','warden'])test(`${skin} fully outside a map edge is defeated immediately`,()=>{
 for(const edge of ['left','right','bottom','top']){
  const w=new SiegeWorld(M),e=w.addEnemy(400,400,skin,{stationary:true}),half=e.dimensions.width/2,h=e.dimensions.height/2;
  const position={left:{x:-half-1,y:200},right:{x:w.width+half+1,y:200},bottom:{x:400,y:w.height+h+1},top:{x:400,y:-h-1}}[edge];
  M.Body.setPosition(e.body,position);w.engine.gravity.scale=0;w.step(1/120);
  assert.equal(e.alive,false,edge);assert.equal(e.dead,true,edge);assert.equal(w.snapshot().enemiesAlive,0,edge);
 }
});
test('a mob partly visible at a map edge is still alive',()=>{
 const w=new SiegeWorld(M),e=w.addEnemy(w.width+10,400,'zombie',{stationary:true});w.engine.gravity.scale=0;w.step(1/120);assert.equal(e.alive,true);
});
test('a low-health mob outside the map cannot remain counted alive after removal',()=>{
 const w=new SiegeWorld(M),e=w.addEnemy(w.width+30,400,'zombie',{stationary:true});w.hurt(e,99);assert.equal(e.hp,1);w.engine.gravity.scale=0;w.step(1/120);assert.equal(e.alive,false);assert.equal(w.snapshot().enemiesAlive,0);
});
test('a TNT collision can push a mob outside, without direct contact damage',()=>{
 const w=new SiegeWorld(M),e=w.addEnemy(w.width-12,400,'zombie',{stationary:true});w.engine.gravity.scale=0;e.externalUntil=10;
 const tnt=w.spawnProjectile('tnt',w.width-90,e.body.position.y,600,0);let harmlessPush=false;
 for(let i=0;i<120&&e.alive;i++){w.step(1/120);if(e.body.velocity.x>1&&e.hp===100)harmlessPush=true;}
 assert.equal(harmlessPush,true);assert.equal(e.alive,false);assert.equal(w.stats.explosions,0);assert.ok(tnt.fuse>0);assert.equal(w.snapshot().enemiesAlive,0);
});
