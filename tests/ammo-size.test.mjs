import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {AMMO} from '../src/config.mjs';import {SiegeWorld} from '../src/world.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
test('四种弹药在弹弓与飞行中同为28px，物理形状匹配显示大小',()=>{
 const w=new SiegeWorld(M);
 for(const a of AMMO){assert.equal(a.size,28);const p=w.spawnProjectile(a.id,100,100,0,0);
  if(['ender','fire'].includes(a.id))assert.equal(p.body.circleRadius,14);else{assert.equal(p.body.bounds.max.x-p.body.bounds.min.x,28);assert.equal(p.body.bounds.max.y-p.body.bounds.min.y,28);}
 }
});
