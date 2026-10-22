import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';import {SiegeWorld} from '../src/world.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const advance=(w,s)=>{for(let i=0;i<s*120;i++)w.step(1/120);};
function world(){const grid=new PixelGrid(240,240);grid.fill(0,128,240,112,7);return new SiegeWorld(M,{grid,pixelSize:2});}
for(const skin of ['zombie','pillager','warden'])test(`${skin} walking into a resting pearl takes no projectile damage`,()=>{
 const w=world(),pearl=w.spawnProjectile('ender',100,210,0,0);advance(w,3);assert.equal(pearl.body.isSleeping,true);
 const e=w.addEnemy(155,256,skin);e.facing=-1;e.actionUntil=w.time+10;const hp=e.hp;
 advance(w,3);
 assert.ok(e.walkDistance>20,'the mob actually walked toward the pearl');
 assert.ok(e.body.bounds.min.x<=pearl.body.bounds.max.x+2,'the mob reached the pearl');
 assert.equal(e.hp,hp);assert.equal(e.alive,true);assert.equal(e.projectileHits.size,0);
});
for(const skin of ['zombie','pillager','warden'])test(`a flying pearl still damages ${skin}`,()=>{
 const w=world();w.engine.gravity.scale=0;const e=w.addEnemy(160,166,skin,{stationary:true}),hp=e.hp;
 w.spawnProjectile('ender',100,e.body.position.y,300,0);advance(w,.8);
 assert.equal(e.hp,skin==='warden'?hp-75:hp-250);assert.equal(e.alive,skin==='warden');
});
