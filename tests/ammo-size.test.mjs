import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {AMMO} from '../src/config.mjs';import {SiegeWorld} from '../src/world.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
test('铁砧接近一格，其他弹药28px；物理形状匹配显示大小',()=>{
 const w=new SiegeWorld(M);
 for(const a of AMMO){assert.equal(a.size,a.id==='anvil'?42:28);const p=w.spawnProjectile(a.id,100,100,0,0);
  if(!['cobble','tnt','anvil','crystal'].includes(a.id))assert.equal(p.body.circleRadius,14);else{assert.equal(p.body.bounds.max.x-p.body.bounds.min.x,a.size);assert.equal(p.body.bounds.max.y-p.body.bounds.min.y,a.size);}
 }
});
