import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';
import {SiegeWorld} from '../src/world.mjs';
import {mobGeometry} from '../src/mobs.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const step=(w,seconds)=>{for(let i=0;i<seconds*120;i++)w.step(1/120);};
function world(){return new SiegeWorld(M,{grid:new PixelGrid(176,176),pixelSize:3});}
function impact(w,projectile,enemy){
 w.before=new Map([[projectile.body.id,{x:4,y:0,omega:0}],[enemy.body.id,{x:0,y:0,omega:0}]]);
 w.processContact({bodyA:projectile.body,bodyB:enemy.body,collision:{normal:{x:1,y:0},supports:[{x:enemy.body.position.x,y:enemy.body.position.y}]}});
}

test('fire consumes connected foreground wood and leaves nonoverlapping rear wood intact',()=>{
 const w=world();
 for(const [tx,ty,m] of [[5,5,4],[4,5,19],[6,5,21],[5,4,17],[5,6,18]])w.grid.tile(tx,ty,m);
 w.rear.grid.tile(6,6,23);w.rear.grid.tile(5,7,15);
 const rear=w.rear.grid.cells.slice(),rearHp=w.rear.grid.hp.slice();
 const original=w.grid.count();assert.equal(typeof w.ignite,'function');
 assert.ok(w.ignite(5*48+24,5*48+24));assert.equal(w.grid.count(),original);
 assert.equal(w.fires.length,5);assert.ok(w.active());
 step(w,1.1);assert.ok(w.grid.count()<original&&w.grid.count()>0,'wood visibly burns before disappearing');
 step(w,5);assert.equal(w.grid.count(),0);assert.deepEqual(w.rear.grid.cells,rear);assert.deepEqual(w.rear.grid.hp,rearHp);assert.equal(w.fires.length,0);
 assert.ok(w.events.some(e=>e.type==='fire'&&e.sound==='fire_burn'));
 assert.equal(w.debris.length,0,'burning never detaches fixed buildings');
});

test('fire stays in its five-cell footprint, cannot cross nonwood gaps, and preserves mineral HP',()=>{
 const w=world();w.grid.fill(2*16,5*16,9*16,16,10);w.grid.tile(5,4,20);w.grid.tile(4,4,2);w.grid.tile(6,4,3);w.grid.tile(5,3,4);
 w.rear.grid.tile(5,4,5);const stoneHp=w.grid.hp[4*16*w.grid.width+6*16];
 assert.equal(typeof w.ignite,'function');w.ignite(5*48+24,5*48+24);step(w,6);
 for(const tx of [4,5,6])assert.equal(w.grid.get(tx*16+8,5*16+8),0,`adjacent tile ${tx}`);
 for(const tx of [2,3,7,8,9])assert.equal(w.grid.get(tx*16+8,5*16+8),10,'nonadjacent wood stays intact');
 assert.equal(w.grid.get(5*16+8,3*16+8),4,'furnace blocks disconnected wood');
 for(const [tx,m] of [[4,2],[5,20],[6,3]])assert.equal(w.grid.get(tx*16+8,4*16+8),m);
 assert.equal(w.grid.hp[4*16*w.grid.width+6*16],stoneHp);assert.equal(w.rear.grid.get(5*16+8,4*16+8),5);
});

test('Warden takes three distinct cobblestone projectiles, repeated contacts from one count once',()=>{
 const w=world(),e=w.addEnemy(250,400,'warden');
 const p=w.spawnProjectile('cobble',180,300,0,0);impact(w,p,e);assert.equal(e.alive,true);assert.equal(e.hp,200);
 w.time+=.2;impact(w,p,e);assert.equal(e.hp,200);
 impact(w,w.spawnProjectile('cobble',180,300,0,0),e);assert.equal(e.hp,100);assert.equal(e.alive,true);
 impact(w,w.spawnProjectile('cobble',180,300,0,0),e);assert.equal(e.alive,false);
 assert.ok(e.dimensions.height>92);assert.equal(e.feetOffset,e.dimensions.height/2);
 assert.ok(w.events.some(v=>v.type==='hurt'&&v.sound==='warden_hurt'));
});

test('Warden survives one TNT blast, dies to the second, and TNT contact is harmless',()=>{
 const w=world(),e=w.addEnemy(250,400,'warden'),p=w.spawnProjectile('tnt',180,300,0,0);
 impact(w,p,e);assert.equal(e.hp,300);assert.equal(e.alive,true);
 w.blast(e.body.position.x,e.body.position.y);assert.equal(e.alive,true);assert.equal(e.hp,150);
 w.blast(e.body.position.x,e.body.position.y);assert.equal(e.alive,false);
});

test('Warden geometry uses its own 128 atlas, tendrils, long arms and animated stance',()=>{
 const faces=mobGeometry('warden',0,1),walk=mobGeometry('warden',1.2,1);
 for(const p of ['head','body','leftArm','rightArm','leftLeg','rightLeg','leftTendril','rightTendril'])assert.ok(faces.some(f=>f.part===p),p);
 for(const f of faces){const [u,v,w,h]=f.uv;assert.ok(u>=0&&v>=0&&u+w<=128&&v+h<=128);}
 assert.ok(faces.some(f=>f.uv[1]>=76));assert.notDeepEqual(faces,walk);
 const head=faces.filter(f=>f.part==='head').flatMap(f=>f.vertices);assert.ok(Math.min(...head.map(v=>v.y))< -45);
});

test('Warden survives the knockback and landing from its first TNT blast',()=>{
 const grid=new PixelGrid(240,160);grid.fill(0,128,240,32,7);
 const w=new SiegeWorld(M,{grid,pixelSize:3}),e=w.addEnemy(300,384,'warden');
 w.blast(e.body.position.x,e.body.position.y);step(w,4);
 assert.equal(e.alive,true);assert.equal(e.hp,150,'landing must not count as another weapon hit');
});

test('a fire charge passes through rear wood without being consumed or creating flames',()=>{
 const w=world();w.engine.gravity.y=0;w.rear.grid.tile(5,5,23);w.grid.tile(5,6,2);
 const rear=w.rear.grid.cells.slice(),rearHp=w.rear.grid.hp.slice();
 const dirt=w.grid.cells.slice(),hp=w.grid.hp.slice(),p=w.spawnProjectile('fire',195,260,360,0);
 step(w,.35);assert.ok(!p.dead);assert.ok(p.body.position.x>302,'the entire charge clears the rear wall');
 assert.equal(w.fires.length,0);assert.ok(!w.events.some(e=>e.type==='fire'));step(w,4);
 assert.deepEqual(w.rear.grid.cells,rear);assert.deepEqual(w.rear.grid.hp,rearHp);
 assert.deepEqual(w.grid.cells,dirt);assert.deepEqual(w.grid.hp,hp);
});

test('rear wood alone cannot ignite or create a burn hazard for an overlapping enemy',()=>{
 const w=world();w.engine.gravity.y=0;w.rear.grid.tile(5,5,10);
 const rear=w.rear.grid.cells.slice(),hp=w.rear.grid.hp.slice(),enemy=w.addEnemy(264,300,'zombie');M.Body.setStatic(enemy.body,true);
 assert.equal(w.ignite(264,264,20,'rear-only'),false);step(w,4);
 assert.equal(enemy.hp,100);assert.equal(enemy.burnTicks.length,0);assert.equal(w.fires.length,0);
 assert.ok(!w.events.some(e=>e.type==='fire'||e.type==='hurt'));
 assert.deepEqual(w.rear.grid.cells,rear);assert.deepEqual(w.rear.grid.hp,hp);
});

test('fire near a wood boundary uses the actual struck cell as its five-cell center',()=>{
 const w=world();for(const [x,y] of [[5,5],[4,5],[6,5],[5,4],[5,6]])w.grid.tile(x,y,10);
 assert.ok(w.ignite(5*48-1,5*48+24));step(w,5);
 for(const [x,y]of [[4,5],[5,5]])assert.equal(w.grid.get(x*16+8,y*16+8),0);
 for(const [x,y]of [[6,5],[5,4],[5,6]])assert.equal(w.grid.get(x*16+8,y*16+8),10);
});

test('a Warden falling outside the arena counts as defeated',()=>{
 const w=world(),e=w.addEnemy(200,w.height+400,'warden');step(w,.02);
 assert.equal(e.alive,false);assert.ok(e.dead);assert.equal(w.snapshot().enemiesAlive,0);
});
