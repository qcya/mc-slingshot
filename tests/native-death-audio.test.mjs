import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
for(const skin of ['zombie','pillager','zombified_piglin','hoglin','warden','shulker','enderman'])test(`${skin} uses its native hurt and death sounds at the actual damage event`,()=>{
 const w=new SiegeWorld(M),e=w.addEnemy(300,600,skin);w.hurt(e,10);assert.equal(w.events.at(-1).sound,skin+'_hurt');
 w.hurt(e,e.hp);assert.equal(w.events.at(-1).sound,skin+'_death');const n=w.events.length;w.hurt(e,100);assert.equal(w.events.length,n);
});
