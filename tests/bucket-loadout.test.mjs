import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryFor,rewardFor,spendAmmo} from '../src/campaign.mjs';
import {playtestInventory} from '../src/playtest.mjs';
const supplies={overworld:[],nether:[4,7,9],end:[4,6],sift:[6]};

test('lava buckets are single-use supplies limited to six selected maps, never a boss finale',()=>{
 for(const [world,levels]of Object.entries(supplies))for(let level=0;level<10;level++){
  const bag=inventoryFor(level,world),expected=Number(levels.includes(level+1));
  assert.equal(bag[5]||0,expected,`${world} ${level+1}: special bucket allocation`);
  if(expected){assert.equal(spendAmmo(bag,5),true);assert.equal(spendAmmo(bag,5),false);}
 }
 assert.equal(rewardFor(2,'nether'),'岩浆桶');
});

test('free play respects one-bucket allocation and cannot add a bucket to the Dragon arena',()=>{
 for(const [world,levels]of Object.entries(supplies))for(let level=0;level<10;level++){
  const bag=playtestInventory(world,level);
  assert.equal(bag[5],Number(levels.includes(level+1)),`${world} ${level+1}: no unlimited bucket bypass`);
 }
 assert.deepEqual(playtestInventory('sift',0),[0,0,0,0,0,0,0,0,3]);
});
