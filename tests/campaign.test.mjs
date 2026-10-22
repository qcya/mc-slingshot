import test from 'node:test';import assert from 'node:assert/strict';
import {readProgress,finishLevel,canEnter,inventoryFor,spendAmmo,totalAmmo,rewardFor,LOADOUTS} from '../src/campaign.mjs';
test('progress opens ten stages in order and preserves replay progress',()=>{
 let p=readProgress(null);assert.equal(canEnter(p,0),true);assert.equal(canEnter(p,1),false);
 for(let level=0;level<10;level++){assert.equal(canEnter(p,level),true);p=finishLevel(p,level);assert.equal(p.unlocked,Math.min(10,level+2));}
 assert.deepEqual(p.completed,[0,1,2,3,4,5,6,7,8,9]);assert.equal(canEnter(p,10),false);
 assert.equal(finishLevel(p,0).unlocked,10);assert.equal(finishLevel(readProgress(null),4).unlocked,1);
 assert.deepEqual(readProgress('{broken'),{unlocked:1,completed:[]});
});
test('original five-clear save migrates to stage six; invalid entries are filtered and progress is clamped',()=>{
 assert.deepEqual(readProgress(JSON.stringify({unlocked:5,completed:[4,3,2,1,0,2]})),{unlocked:6,completed:[0,1,2,3,4]});
 assert.equal(readProgress(JSON.stringify({unlocked:5,completed:[0,1,2,3]})).unlocked,5);
 assert.deepEqual(readProgress(JSON.stringify({unlocked:99,completed:[9,2,0,2,10,-1,3.5]})),{unlocked:10,completed:[0,2,9]});
});
test('four finite ammo slots unlock TNT, pearl and fire after stages one, two and three',()=>{
 assert.equal(LOADOUTS.length,10);assert.deepEqual(inventoryFor(0),[5,0,0,0]);assert.deepEqual(inventoryFor(1),[5,1,0,0]);
 assert.equal(inventoryFor(2)[3],0);assert.ok(inventoryFor(3)[3]>0);
 assert.deepEqual([0,1,2,3].map(level=>rewardFor(level)),['TNT','末影珍珠','烈焰弹',null]);
 const ammo=inventoryFor(1);assert.equal(spendAmmo(ammo,1),true);assert.equal(spendAmmo(ammo,1),false);
 assert.equal(totalAmmo(ammo),5);assert.deepEqual(inventoryFor(1),[5,1,0,0]);
 for(const loadout of LOADOUTS){assert.equal(loadout.length,4);assert.ok(loadout.every(n=>Number.isInteger(n)&&n>=0));}
});


test('early and middle stages keep a measured finite retry allowance',()=>{
 assert.equal(totalAmmo(inventoryFor(0)),5,'the opening now emphasizes ordinary stones');
 for(const loadout of LOADOUTS){assert.ok(totalAmmo(loadout)>0&&totalAmmo(loadout)<18);assert.ok(loadout.filter(n=>n>0).length<=4);}
 assert.deepEqual(inventoryFor(9),[9,4,2,0],'final-stage fifteen-shot budget keeps ordinary stones as the main retry allowance');
});
