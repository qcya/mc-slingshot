import test from 'node:test';
import assert from 'node:assert/strict';
import {AMMO} from '../src/config.mjs';
import {hotbarSlots,inventoryFor,rewardFor} from '../src/campaign.mjs';

test('nine items follow the approved four/two/two/one progression',()=>{
 assert.deepEqual(AMMO.map(a=>a.id),['cobble','tnt','ender','fire','slimeball','anvil','wind','crystal','trident']);
 assert.deepEqual(hotbarSlots({unlocked:1},'nether'),[0,1,2,3,4,null,null,null,null]);
 assert.deepEqual(hotbarSlots({unlocked:4},'nether'),[0,1,2,3,4,5,null,null,null]);
 assert.deepEqual(hotbarSlots({unlocked:1},'end'),[0,1,2,3,4,5,6,null,null]);
 assert.deepEqual(hotbarSlots({unlocked:4},'end'),[0,1,2,3,4,5,6,7,null]);
 assert.equal(rewardFor(2,'nether'),'铁砧');assert.equal(rewardFor(2,'end'),'末地水晶');
});
test('earlier-world revisits keep globally earned item icons without extra supplies',()=>{
 assert.deepEqual(hotbarSlots({unlocked:10},'overworld',{nether:{unlocked:10},end:{unlocked:4}}),[0,1,2,3,4,5,6,7,null]);
 assert.equal(inventoryFor(0,'overworld')[0],5);
 assert.ok(inventoryFor(0,'nether')[4]>0);assert.equal(inventoryFor(0,'nether')[5],0);
 assert.ok(inventoryFor(3,'nether')[5]>0);
 assert.ok(inventoryFor(0,'end')[6]>0);assert.equal(inventoryFor(0,'end')[7],0);
 assert.ok(inventoryFor(3,'end')[7]>0);
});
