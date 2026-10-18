import test from 'node:test';import assert from 'node:assert/strict';
import {LOADOUTS,inventoryFor,hotbarSlots} from '../src/campaign.mjs';import {buildLevel} from '../src/levels.mjs';
test('level-specific loadouts favor stones, fit three kinds and include a no-stone challenge',()=>{
 assert.ok(LOADOUTS.every(items=>items.filter(n=>n>0).length<=3));
 assert.ok(LOADOUTS.filter(items=>items[0]>0).every(items=>items[0]>=items[1]));
 assert.ok(inventoryFor(0)[0]>=5);assert.ok(LOADOUTS.some(items=>items[0]===0));
 for(const i of [1,4,8,9])assert.equal(inventoryFor(i)[3],0,'stone structures do not get an unnecessary fire charge');
});
test('the nine hotbar positions unlock independently from the current level inventory',()=>{
 assert.deepEqual(hotbarSlots({unlocked:1}),[0,null,null,null,null,null,null,null,null]);assert.deepEqual(hotbarSlots({unlocked:2}),[0,1,null,null,null,null,null,null,null]);assert.deepEqual(hotbarSlots({unlocked:10}),[0,1,2,3,null,null,null,null,null]);
});
test('zombies have solid cover above their head, with tower zombies in the lower room',()=>{
 for(let level=0;level<10;level++)for(const mob of buildLevel(level).enemies.filter(e=>e.skin==='zombie')){
  const scene=buildLevel(level),x=Math.floor(mob.x/3),head=Math.floor((mob.feet-mob.height)/3);
  assert.ok(Array.from({length:head},(_,y)=>scene.grid.get(x,y)).some(Boolean),`stage ${level+1} zombie at ${mob.x} needs overhead shade`);
 }
 assert.ok(buildLevel(1).enemies.filter(e=>e.skin==='zombie').every(e=>e.feet>=13*48));
});
