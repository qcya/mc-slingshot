import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryFor,readProgress,hotbarSlots} from '../src/campaign.mjs';

test('each new world owns ten finite loadouts and begins at its first stage',()=>{
  for(const world of ['nether','end']){
    assert.deepEqual(readProgress(null,world),{unlocked:1,completed:[]});
    assert.equal(readProgress(JSON.stringify({unlocked:5,completed:[0,1,2,3,4]}),world).unlocked,5);
    const bags=Array.from({length:10},(_,i)=>inventoryFor(i,world));
    assert.ok(bags.every(b=>b.length===9&&b.every(n=>Number.isInteger(n)&&n>=0)));
    assert.ok(bags.every(b=>b[0]>=5&&b.reduce((a,b)=>a+b,0)<=24));
    assert.equal(hotbarSlots({unlocked:1},world).filter(v=>v!==null).length,world==='nether'?5:8);
    const a=inventoryFor(0,world);a[0]=999;assert.notEqual(inventoryFor(0,world)[0],999);
  }
});
test('all five new items are allocated somewhere without displacing ordinary stone',()=>{
 const bags=['overworld','nether','end'].flatMap(world=>Array.from({length:10},(_,i)=>inventoryFor(i,world)));
 for(let slot=4;slot<9;slot++)assert.ok(bags.some(b=>b[slot]>0),`slot ${slot} is playable`);
 assert.deepEqual(hotbarSlots({unlocked:10}),[0,1,2,3,null,null,null,null,null]);
 assert.deepEqual(hotbarSlots({unlocked:10},'nether'),[0,1,2,3,4,5,6,null,null]);
 assert.deepEqual(hotbarSlots({unlocked:10},'end'),[0,1,2,3,4,5,6,7,8]);
});
test('three new items arrive in Nether and two more arrive in End',()=>{
 for(let level=0;level<10;level++){
  const nether=inventoryFor(level,'nether'),end=inventoryFor(level,'end');
  assert.deepEqual(nether.slice(7),[0,0]);
  if(level<3){assert.equal(nether[5],0);assert.equal(end[8],0);}
  if(level<6)assert.equal(nether[6],0);
 }
});
