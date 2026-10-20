import test from 'node:test';import assert from 'node:assert/strict';
import {createToyOnlineClient,encodeTime} from '../src/toy-online.mjs';
test('updating the existing Toy never reads or overwrites legacy board one',async()=>{
 const calls=[],client=createToyOnlineClient({getUser:()=>({toyOpenId:'player',nickname:'Player'}),sdk:{
  getMyRank:async p=>(calls.push(['own',p.board]),{score:p.board===1?encodeTime(1000):0}),
  getRankList:async p=>(calls.push(['list',p.board]),{list:p.board===1?[{score:encodeTime(1000),user:{toyOpenId:'old',nickname:'旧地图成绩'}}]:[]}),
  submitScore:async p=>calls.push(['submit',p.board])
 }});
 for(const id of ['overworld','nether','end']){
  assert.deepEqual((await client.leaderboard(id)).entries,[]);
  await client.submitResult('token',{stages:Array.from({length:10},(_,stage)=>({stage,timeMs:1000}))},id);
 }
 assert.equal(calls.some(([,board])=>board===1),false);
 assert.deepEqual(calls.filter(([kind])=>kind==='submit').map(([,board])=>board),[2,3,4]);
});
