import test from 'node:test';import assert from 'node:assert/strict';
import {createToyStorage,TOY_CLOUD_KEY} from '../src/toy-storage.mjs';
import {SAVE_KEY} from '../src/campaign.mjs';import {TIME_SAVE_KEY} from '../src/timing.mjs';
test('the approved owner recovery restores yesterday but never another Toy account',async()=>{
 const owner=fixture();owner.sdk.getUserProfile=async()=>({toyOpenId:'new-owner',nickname:'青春沿岸'});await owner.initialize();
 const times=JSON.parse(owner.getItem(TIME_SAVE_KEY));assert.equal(times.reduce((n,t)=>n+t,0),435135);
 assert.deepEqual(JSON.parse(owner.getItem(SAVE_KEY)),{unlocked:10,completed:[0,1,2,3,4,5,6,7,8,9]});
 await owner.flush();assert.equal(JSON.parse(owner.calls.find(c=>c[0]==='set')[1][TOY_CLOUD_KEY]).values[TIME_SAVE_KEY],JSON.stringify(times));
 const other=fixture();other.sdk.getUserProfile=async()=>({toyOpenId:'other-player',nickname:'其他玩家'});await other.initialize();assert.equal(other.getItem(TIME_SAVE_KEY),null);
});
test('owner recovery keeps faster cloud records and does not write after a cloud read failure',async()=>{
 const faster=fixture();faster.sdk.getUserProfile=async()=>({toyOpenId:'new-owner',nickname:'青春沿岸'});
 faster.sdk.getCloudStorage=async()=>({[TOY_CLOUD_KEY]:JSON.stringify({version:1,values:{[TIME_SAVE_KEY]:JSON.stringify([1000])}})});await faster.initialize();assert.equal(JSON.parse(faster.getItem(TIME_SAVE_KEY))[0],1000);
 const offline=fixture();offline.sdk.getUserProfile=async()=>({toyOpenId:'new-owner',nickname:'青春沿岸'});offline.sdk.getCloudStorage=async()=>{throw Error('offline');};await offline.initialize();await offline.flush();assert.equal(offline.calls.filter(c=>c[0]==='set').length,0);
});
const PROFILE='mc-block-launch.profile.v1';
function fixture(extra={}){const map=new Map(),calls=[],storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))};const sdk={getUserProfile:async()=>({toyOpenId:'account-A'}),getCloudStorage:async keys=>{calls.push(['get',keys]);return {};},setCloudStorage:async values=>calls.push(['set',values])};return {...createToyStorage({enabled:true,storage,sdk,autoFlush:false,...extra}),map,calls,sdk};}

test('normal hosted game storage stays unchanged and never calls Toy',async()=>{const f=fixture({enabled:false});await f.initialize();f.setItem(PROFILE,'local');assert.equal(f.map.get(PROFILE),'local');await f.flush();assert.deepEqual(f.calls,[]);});
test('Toy restores account-scoped profile, partial progress and fastest times in one cloud read',async()=>{
 const f=fixture();const profile={id:'a'.repeat(22),token:'b'.repeat(43),nickname:'Toy玩家'};
 f.sdk.getCloudStorage=async keys=>{f.calls.push(['get',keys]);return {[TOY_CLOUD_KEY]:JSON.stringify({version:1,values:{[SAVE_KEY]:JSON.stringify({unlocked:4,completed:[0,1,2]}),[TIME_SAVE_KEY]:JSON.stringify([3000,4000]),[PROFILE]:JSON.stringify(profile)}})};};
 f.map.set('mc-slingshot.toy.account-A.'+TIME_SAVE_KEY,JSON.stringify([2500,4500]));await f.initialize();
 assert.equal(JSON.parse(f.getItem(PROFILE)).nickname,'Toy玩家');assert.deepEqual(JSON.parse(f.getItem(TIME_SAVE_KEY)).slice(0,2),[2500,4000]);assert.equal(JSON.parse(f.getItem(SAVE_KEY)).unlocked,4);assert.equal(f.calls.filter(c=>c[0]==='get').length,1);
 await f.flush();assert.equal(f.calls.filter(c=>c[0]==='set').length,1);
 const other=fixture({storage:{getItem:k=>f.map.get(k)??null,setItem:(k,v)=>f.map.set(k,v)}});other.sdk.getUserProfile=async()=>({toyOpenId:'account-B'});await other.initialize();assert.equal(other.getItem(PROFILE),null);
});
test('failed initial cloud read cannot overwrite an existing remote save',async()=>{const f=fixture();f.sdk.getCloudStorage=async()=>{throw Error('offline');};await f.initialize();f.setItem(SAVE_KEY,JSON.stringify({unlocked:2,completed:[0]}));await f.flush();assert.equal(f.calls.filter(c=>c[0]==='set').length,0);assert.equal(f.status().ready,false);assert.equal(JSON.parse(f.getItem(SAVE_KEY)).unlocked,2);});
test('cloud limit errors back off while keeping local progress and coalesce the next write',async()=>{
 let clock=0;const f=fixture({now:()=>clock});await f.initialize();let attempts=0;f.sdk.setCloudStorage=async()=>{if(++attempts===1)throw {code:307044,type:'http_error'};};
 f.setItem(SAVE_KEY,JSON.stringify({unlocked:2,completed:[0]}));f.setItem(TIME_SAVE_KEY,JSON.stringify([2000]));await f.flush();assert.equal(attempts,1);assert.ok(f.status().retryAfterMs>0);await f.flush();assert.equal(attempts,1);
 clock=100000;await f.flush();assert.equal(attempts,2);assert.equal(f.status().dirty,false);assert.equal(JSON.parse(f.getItem(TIME_SAVE_KEY))[0],2000);
});
test('cloud write keeps a new edit queued while an earlier snapshot is in flight',async()=>{const f=fixture();await f.initialize();let release;const writes=[];f.sdk.setCloudStorage=async v=>{writes.push(v);if(writes.length===1)await new Promise(r=>release=r);};f.setItem(TIME_SAVE_KEY,'[3000]');const first=f.flush();await Promise.resolve();f.setItem(TIME_SAVE_KEY,'[2000]');release();await first;assert.equal(f.status().dirty,true);await f.flush();assert.equal(writes.length,2);assert.equal(JSON.parse(writes[1][TOY_CLOUD_KEY]).values[TIME_SAVE_KEY],'[2000]');});
test('a slow SDK write stays serialized beyond the adapter read timeout',async()=>{
 let clock=0,release,remote,calls=0;const f=fixture({timeoutMs:10,now:()=>clock});await f.initialize();f.sdk.setCloudStorage=async value=>{calls++;if(calls===1)await new Promise(r=>release=r);remote=value;};
 f.setItem(TIME_SAVE_KEY,'[3000]');const first=f.flush();await new Promise(r=>setTimeout(r,30));f.setItem(TIME_SAVE_KEY,'[2000]');clock=100000;const second=f.flush();await new Promise(r=>setTimeout(r,5));
 try{assert.equal(calls,1,'a late first write must not overlap a newer write');}finally{release();await first;await second;}
 await f.flush();assert.equal(calls,2);assert.equal(JSON.parse(remote[TOY_CLOUD_KEY]).values[TIME_SAVE_KEY],'[2000]');assert.equal(f.status().dirty,false);
});
