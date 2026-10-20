import test from 'node:test';import assert from 'node:assert/strict';
import {createToyOnlineClient,encodeTime,decodeTime} from '../src/toy-online.mjs';
const bundle=value=>({stages:Array.from({length:10},(_,stage)=>({stage,timeMs:value}))});
function fixture(){const calls=[],user={toyOpenId:'user-A',nickname:'平台玩家'};let times=[];const sdk={getUserProfile:async()=>user,getMyRank:async()=>({rank:0,score:0}),submitScore:async v=>{calls.push(v);return v;},getRankList:async()=>({list:[{rank:1,score:encodeTime(20000),user:{toyOpenId:'other',nickname:'更快玩家'}}]})};return {client:createToyOnlineClient({sdk,getUser:()=>user,getTimes:()=>times}),calls,sdk,setTimes:v=>times=v};}
test('native Toy score makes a shorter total rank higher and covers ten one-hour stages',()=>{assert.ok(encodeTime(20000)>encodeTime(30000));for(const n of [1000,397000,36000000])assert.equal(decodeTime(encodeTime(n)),n);assert.equal(decodeTime(encodeTime(12345)),12350);});
test('native Toy identity follows the platform and partial runs never submit',async()=>{const f=fixture(),p=await f.client.createProfile('ignored');assert.equal(p.profile.nickname,'平台玩家');assert.equal(p.profile.provider,'toy');await assert.rejects(f.client.submitResult(p.token,{stages:[{stage:0,timeMs:1000}]}));assert.equal(f.calls.length,0);});
test('full clear submits only a faster best, including across browser sessions',async()=>{const f=fixture();await f.client.submitResult('token',bundle(3000));await f.client.submitResult('token',bundle(3500));await f.client.submitResult('token',bundle(2000));assert.deepEqual(f.calls,[{board:1,score:encodeTime(30000)},{board:1,score:encodeTime(20000)}]);const g=fixture();g.sdk.getMyRank=async()=>({score:encodeTime(15000)});await g.client.submitResult('token',bundle(2000));assert.equal(g.calls.length,0);});
test('Toy board decodes only real native rows and never calls a home API',async()=>{const f=fixture(),board=await f.client.leaderboard();assert.equal(board.entries[0].nickname,'更快玩家');assert.equal(board.entries[0].totalTimeMs,20000);assert.equal(board.entries.length,1);});
test('native ranking limit errors back off without a retry loop',async()=>{let now=0,calls=0;const client=createToyOnlineClient({sdk:{getRankList:async()=>{calls++;throw {code:307044};}},now:()=>now});await assert.rejects(client.leaderboard());await assert.rejects(client.leaderboard());assert.equal(calls,1);now=100000;await assert.rejects(client.leaderboard());assert.equal(calls,2);});
test('a failed native identity request can recover without reloading the game',async()=>{let calls=0;const client=createToyOnlineClient({sdk:{getUserProfile:async()=>{if(++calls===1)throw Error('offline');return {toyOpenId:'restored',nickname:'恢复玩家'};}}});await assert.rejects(client.createProfile());assert.equal((await client.createProfile()).profile.nickname,'恢复玩家');assert.equal(calls,2);});
test('a fresh Toy has three empty boards without historical or sample rows',async()=>{
 const f=fixture();f.sdk.getRankList=async()=>({list:[]});
 for(const world of ['overworld','nether','end'])assert.deepEqual((await f.client.leaderboard(world)).entries,[]);
});

test('three worlds submit independently and cache only their own board',async()=>{
 const calls=[],scores=new Map(),reads=[];
 const client=createToyOnlineClient({getUser:()=>({toyOpenId:'traveller',nickname:'旅行者'}),getTimes:world=>Array(10).fill(world==='nether'?2000:3000),sdk:{
  getMyRank:async({board})=>({score:scores.get(board)||0}),
  submitScore:async({board,score})=>{calls.push(board);scores.set(board,Math.max(scores.get(board)||0,score));},
  getRankList:async({board})=>{reads.push(board);return {list:[{score:scores.get(board),user:{toyOpenId:'traveller',nickname:'旅行者'}}]};}
 }});
 for(const world of ['overworld','nether','end'])await client.submitResult('token',bundle(2000),world);
 assert.deepEqual(calls,[1,2,3]);
 assert.equal((await client.profile('token','nether')).stages[0].timeMs,2000);
 for(const world of ['overworld','nether','end']){
  const result=await client.leaderboard(world);assert.equal(result.entries.find(e=>e.nickname==='旅行者').totalTimeMs,20000);
  assert.equal(result.entries.some(e=>e.nickname==='星海_Astra'),false);
  await client.leaderboard(world);
 }
 assert.deepEqual(reads,[1,2,3]);
 await client.submitResult('token',bundle(1000),'nether');
 assert.equal((await client.leaderboard('nether')).entries[0].totalTimeMs,10000);
 assert.equal((await client.leaderboard('end')).entries[0].totalTimeMs,20000);
 assert.deepEqual(reads,[1,2,3,2]);
 await assert.rejects(client.submitResult('token',bundle(1000),'moon'));
 assert.deepEqual(calls,[1,2,3,2]);
});

test('an old rank response cannot refill a cache after a faster score is submitted',async()=>{
 let release,reads=0,score=encodeTime(30000);
 const client=createToyOnlineClient({getUser:()=>({toyOpenId:'race',nickname:'Race'}),sdk:{getMyRank:async()=>({score}),submitScore:async p=>{score=p.score;},getRankList:async()=>{
  const value=score;if(++reads===1)await new Promise(resolve=>release=resolve);return {list:[{score:value,user:{toyOpenId:'race',nickname:'Race'}}]};
 }}});
 const first=client.leaderboard('end');await Promise.resolve();await client.submitResult('token',bundle(1000),'end');release();await first;
 assert.equal((await client.leaderboard('end')).entries[0].totalTimeMs,10000);assert.equal(reads,2);
});

test('a slower earlier refresh cannot replace the newest response in a world cache',async()=>{
 let release,reads=0;
 const client=createToyOnlineClient({sdk:{getRankList:async()=>{
  const first=++reads===1;if(first)await new Promise(resolve=>release=resolve);
  return {list:[{score:encodeTime(first?30000:10000),user:{toyOpenId:'race',nickname:'Race'}}]};
 }}});
 const old=client.leaderboard('nether');await Promise.resolve();
 assert.equal((await client.leaderboard('nether')).entries[0].totalTimeMs,10000);release();await old;
 assert.equal((await client.leaderboard('nether')).entries[0].totalTimeMs,10000);assert.equal(reads,2);
});
