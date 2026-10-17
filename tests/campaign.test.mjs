import test from 'node:test';import assert from 'node:assert/strict';
import {readProgress,finishLevel,canEnter,inventoryFor,spendAmmo,totalAmmo} from '../src/campaign.mjs';

test('新存档只开放第一关，过关逐步开放并保留重玩进度',()=>{
 let p=readProgress(null);assert.equal(canEnter(p,0),true);assert.equal(canEnter(p,1),false);
 p=finishLevel(p,0);assert.equal(p.unlocked,2);assert.equal(canEnter(p,1),true);assert.equal(canEnter(p,2),false);
 p=finishLevel(p,1);assert.equal(p.unlocked,3);assert.equal(readProgress(JSON.stringify(p)).unlocked,3);
 assert.equal(finishLevel(p,0).unlocked,3);assert.equal(finishLevel(readProgress(null),4).unlocked,1);
 assert.equal(readProgress('{broken').unlocked,1);
});
test('第一关五圆石，第二关四圆石一TNT；只扣当前物品且不能透支',()=>{
 const first=inventoryFor(0),second=inventoryFor(1);assert.deepEqual(first,[5,0,0]);assert.deepEqual(second,[4,1,0]);
 assert.equal(spendAmmo(second,1),true);assert.deepEqual(second,[4,0,0]);assert.equal(spendAmmo(second,1),false);
 assert.equal(totalAmmo(second),4);assert.deepEqual(inventoryFor(1),[4,1,0]);
});
