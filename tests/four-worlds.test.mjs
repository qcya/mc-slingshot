import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLevel,levelsFor} from '../src/levels.mjs';
import {worldUnlocked,inventoryFor} from '../src/campaign.mjs';
import {WORLDS} from '../src/dimensions.mjs';
import {createToyOnlineClient,encodeTime} from '../src/toy-online.mjs';
const full=Array(10).fill(1200);
test('the fourth ten-stage world unlocks only after all three preceding worlds',()=>{
 assert.deepEqual(WORLDS.map(w=>w.id),['overworld','nether','end','sift']);
 assert.equal(worldUnlocked('sift',full,full,[]),false);assert.equal(worldUnlocked('sift',full,[],full),false);
 assert.equal(worldUnlocked('sift',full,full,full),true);assert.equal(levelsFor('sift').length,10);
 const hashes=new Set();for(let i=0;i<10;i++){const s=buildLevel(i,'sift');assert.equal(s.dimension,'sift');assert.ok(s.enemies.length>=2);assert.ok(inventoryFor(i,'sift')[8]>0);hashes.add(Buffer.from(s.grid.cells).toString('base64'));
  for(const e of s.enemies){const half=e.skin==='warden'?29:16;for(let y=e.feet-e.height+2;y<e.feet-2;y+=3)for(let x=e.x-half+2;x<e.x+half-2;x+=3)assert.equal(s.grid.get(x/3,y/3),0,`Sift ${i+1}: initial body overlaps terrain`);}
 }
 assert.equal(hashes.size,10);assert.throws(()=>buildLevel(0,'missing'),RangeError);
});
test('Toy uses all five boards without changing the existing three and requires forty valid times for total',async()=>{
 const calls=[],times={overworld:full,nether:full,end:full,sift:[]};
 const c=createToyOnlineClient({getTimes:id=>times[id],getUser:()=>({toyOpenId:'qa',nickname:'QA'}),sdk:{getMyRank:async()=>({score:0}),submitScore:async p=>calls.push(p),getRankList:async()=>({list:[]})}});
 assert.equal(typeof c.submitTotal,'function');assert.equal(await c.submitTotal(),false);assert.equal(calls.length,0);
 times.sift=full;await c.submitTotal();assert.deepEqual(calls,[{board:1,score:encodeTime(48000)}]);
 await c.submitResult('token',{stages:full.map((timeMs,stage)=>({stage,timeMs}))},'sift');assert.equal(calls[1].board,5);
 assert.deepEqual(WORLDS.slice(0,3).map(w=>w.board),[2,3,4]);
});
test('a forty-hour total remains inside the SDK signed score range and submits even when negative',async()=>{
 const calls=[],c=createToyOnlineClient({getTimes:()=>Array(10).fill(3600000),getUser:()=>({toyOpenId:'qa',nickname:'QA'}),sdk:{getMyRank:async()=>({rank:0,score:0}),submitScore:async p=>calls.push(p)}});
 await c.submitTotal();assert.equal(calls[0].score,encodeTime(144000000));assert.ok(calls[0].score<0&&calls[0].score>=-(2**24));
});
