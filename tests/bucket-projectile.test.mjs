import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {AMMO,PROJECTILES} from '../src/config.mjs';
import {PixelGrid} from '../src/pixels.mjs';
import {SiegeWorld} from '../src/world.mjs';
import {predictArc} from '../src/aim.mjs';
import {projectileDamage} from '../src/combat.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function fixture(){const world=new SiegeWorld(M,{grid:new PixelGrid(256,240)});world.engine.gravity.y=0;return world;}
function contact(world,p){for(let i=0;i<240&&!p.dead;i++)world.step(1/120);assert.ok(p.dead,'bucket reaches and disappears at its first actual Matter contact');}

for(const [name,start,velocity]of [
 ['left wall',[220,264],[600,0]],['right wall',[405,264],[-600,0]],
 ['ground',[312,180],[0,600]],['ceiling',[312,360],[0,-600]]
])test(`lava bucket ${name} impact pours once and leaves the mineral terrain intact`,()=>{
 const w=fixture();w.grid.tile(6,5,6);w.synchronize();const pixels=w.grid.cells.slice(),hp=w.grid.hp.slice();
 const p=w.spawnProjectile('lava_bucket',...start,...velocity);contact(w,p);
 assert.equal(w.lava.sources.length,1);assert.equal(w.lava.sources[0].potent,true);
 assert.deepEqual(w.grid.cells,pixels);assert.deepEqual(w.grid.hp,hp);assert.equal(w.stats.removed,0);
 const pair=w.contacts.find(pair=>pair.bodyA.parent===p.body||pair.bodyB.parent===p.body);
 assert.ok(pair);w.time+=.15;w.processContact(pair);assert.equal(w.lava.sources.length,1,'a queued repeat cannot pour after the bucket was removed');
 for(let i=0;i<24;i++)w.step(1/120);
 assert.equal(w.lava.sources.length,1);assert.ok(w.lava.cells.size>0,'source occupies open air beside the actual struck surface');
});

test('a real creature hit latches lava without impact damage or anvil head-rest behavior',()=>{
 const w=fixture(),e=w.addEnemy(360,340,'hoglin',{stationary:true});M.Body.setStatic(e.body,true);
 const p=w.spawnProjectile('lava_bucket',220,e.body.position.y,600,0);contact(w,p);
 assert.equal(e.hp,300,'only later lava burn ticks may damage the target');assert.equal(w.stats.enemyDamage,0);
 assert.ok(e.bucketBurn);assert.equal(w.active(),true);assert.equal(p.restingOnEnemy,undefined);assert.equal(p.plunging,undefined);
 assert.equal(w.lava.sources.length,1);assert.equal(e.projectileHits.size,0);
 w.lava.sources.length=0;w.lava.cells.clear();w.lava.settling=false;
 assert.equal(w.active(),true,'permanent burn keeps the outcome clock waiting even after lava and moving bodies are gone');
});

test('a bucket colliding with an older projectile still pours at that first contact',()=>{
 const w=fixture(),older=w.spawnProjectile('cobble',340,264,0,0);M.Body.setStatic(older.body,true);
 const p=w.spawnProjectile('lava_bucket',220,264,600,0);contact(w,p);
 assert.equal(w.lava.sources.length,1);assert.equal(older.dead,undefined);
});

test('a high-speed bucket impact triggers a crystal and still pours once',()=>{
 const w=fixture(),crystal=w.spawnProjectile('crystal',340,264,0,0);M.Body.setStatic(crystal.body,true);
 const p=w.spawnProjectile('lava_bucket',220,264,600,0);contact(w,p);
 assert.equal(w.lava.sources.length,1);assert.equal(crystal.dead,true);assert.equal(w.stats.explosions,1);
});

test('a bucket flying out of the empty map never pours',()=>{
 const w=fixture(),p=w.spawnProjectile('lava_bucket',w.width-20,264,600,0);contact(w,p);
 assert.equal(w.lava.sources.length,0);
});

test('lava buckets follow the ordinary box projectile arc and legacy anvil previews still load',()=>{
 const w=fixture(),origin={x:220,y:380};w.engine.gravity.y=1;
 const path=predictArc(w,'lava_bucket',origin,500,-250),p=w.spawnProjectile('lava_bucket',origin.x,origin.y,500,-250);
 assert.equal(AMMO[5].id,'lava_bucket');assert.equal(AMMO.length,9);assert.ok(!AMMO.some(a=>a.id==='anvil'));
 assert.equal(p.body.circleRadius,0);assert.equal(p.body.mass,2.4);assert.equal(p.body.bounds.max.x-p.body.bounds.min.x,28);
 let step=0;for(const point of path){while(step<point.step){w.step(1/120);step++;}assert.ok(Math.hypot(p.body.position.x-point.x,p.body.position.y-point.y)<.1);}
 assert.equal(PROJECTILES.find(a=>a.id==='anvil').size,42);assert.equal(predictArc(w,'anvil',origin,500,-250).length,5);
 assert.equal(w.spawnProjectile('anvil',120,120,0,0).ammo.id,'anvil');
});

test('the projectile damage helper never turns a bucket into a direct damage weapon',()=>{
 const w=fixture(),e=w.addEnemy(360,340,'hoglin'),p=w.spawnProjectile('lava_bucket',220,264,600,0);
 w.before=new Map([[p.body.id,{x:10,y:0}]]);projectileDamage(w,e,p,600);
 assert.equal(e.hp,300);assert.equal(e.projectileHits.size,0);
});
