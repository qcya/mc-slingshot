import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {PixelGrid} from '../src/pixels.mjs';
import {gust} from '../src/combat.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const advance=(w,s)=>{for(let i=0;i<s*120;i++)w.step(1/120);};
function world(){const grid=new PixelGrid(320,160);grid.fill(0,128,320,32,7);return new SiegeWorld(M,{grid});}
test('crystals land without a fuse, remain visible, and cannot hurt walkers',()=>{
 const w=world(),c=w.spawnProjectile('crystal',300,350,0,0);advance(w,22);
 assert.equal(c.dead,undefined);assert.equal(c.placed,true);assert.equal(c.body.isStatic,true);assert.equal(w.stats.explosions,0);
 const e=w.addEnemy(300,384,'hoglin');advance(w,2);assert.equal(e.hp,300);assert.equal(w.stats.explosions,0);
});
test('one fast stone detonates a connected crystal group once at the placed positions',()=>{
 const w=world(),positions=[300,420,540],crystals=positions.map(x=>w.spawnProjectile('crystal',x,350,0,0));advance(w,.7);
 const target=w.addEnemy(610,384,'hoglin');M.Body.setStatic(target.body,true);
 w.spawnProjectile('cobble',180,365,800,0);advance(w,.5);
 assert.equal(w.stats.explosions,3);assert.ok(crystals.every(c=>c.dead));assert.equal(target.hp,150);
 assert.deepEqual(w.events.filter(e=>e.type==='explosion').map(e=>Math.round(e.x)),positions);
});
test('a resting stone or an unarmed crystal touching a wall does not trigger a group',()=>{
 const w=world();w.spawnProjectile('cobble',300,370,0,0);w.spawnProjectile('crystal',310,350,0,0);advance(w,3);assert.equal(w.stats.explosions,0);
});
test('a wind burst detonates a placed crystal instead of leaving phantom motion',()=>{
 const w=world(),c=w.spawnProjectile('crystal',300,350,0,0);advance(w,1);assert.equal(c.placed,true);
 gust(w,280,360);assert.equal(c.dead,true);assert.equal(w.stats.explosions,1);assert.equal(w.active(),false);
});
test('a flying trident passes multiple creatures and returns after hitting a solid wall',()=>{
 const w=world();w.engine.gravity.y=0;
 const a=w.addEnemy(300,350,'pillager'),b=w.addEnemy(450,350,'pillager');M.Body.setStatic(a.body,true);M.Body.setStatic(b.body,true);
 w.grid.fill(200,0,16,128,7);w.synchronize();
 const p=w.spawnProjectile('trident',150,300,900,0);advance(w,1);
 assert.equal(a.alive,false);assert.equal(b.alive,false);assert.ok(p.body.position.x<600);advance(w,1);assert.equal(p.returned,true);assert.equal(p.dead,true);
});
