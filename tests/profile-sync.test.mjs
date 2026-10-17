import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import {parseTimeBundle,normalizeTimes,recordBestTime,timeBundle} from '../src/timing.mjs';
const source=fs.readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
// Execute the actual application functions with controlled storage/network/DOM.
const functions=source.slice(source.indexOf('function readLocal('),source.indexOf('async function showLeaderboard('));
function fixture(){
 const storage=new Map(),nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',value:'新昵称',disabled:false,classList:{toggle(){}}});return nodes.get(id);};
 const context=vm.createContext({console,queueMicrotask,parseTimeBundle,normalizeTimes,recordBestTime,timeBundle,TIME_SAVE_KEY:'times',bestTimes:[],PROFILE_KEY:'profile',PENDING_KEY:'pending',profile:{id:'id',token:'token',nickname:'旧昵称'},profileRevision:0,profileReturn:'levels',syncing:false,state:{screen:'levels'},online:{},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},$:node,cancelDrag(){},menus(screen){context.state.screen=screen;}});
 vm.runInContext('const appStorage=localStorage;const nativeOnline=false;',context);vm.runInContext(functions,context);return {context,storage,node};
}
const bundle=t=>({stages:Array.from({length:10},(_,stage)=>({stage,timeMs:t}))});
test('a faster full run queued during upload is drained without another win or reload',async()=>{
 const {context:c,storage}=fixture(),submitted=[];let release;
 storage.set('pending',JSON.stringify([bundle(5000)]));
 c.online.submitResult=async(token,score)=>{submitted.push(score.stages[0].timeMs);if(submitted.length===1)await new Promise(r=>release=r);};
 const sync=c.syncResults();while(!release)await Promise.resolve();storage.set('pending',JSON.stringify([bundle(4000)]));await c.syncResults();release();await sync;
 assert.deepEqual(submitted,[5000,4000]);assert.equal(storage.get('pending'),'[]');
});
test('late nickname response preserves a game started after leaving the profile window',async()=>{
 const {context:c,node}=fixture();let release;c.state.screen='profile';c.online.updateProfile=()=>new Promise(r=>release=r);
 const save=c.saveProfile({preventDefault(){}});c.state.screen='play';release({profile:{id:'id',nickname:'新昵称'}});await save;
 assert.equal(c.state.screen,'play');assert.equal(c.profile.nickname,'新昵称');assert.equal(node('#saveProfile').disabled,false);
});
test('failed score upload leaves the score queued and stops instead of retrying forever',async()=>{
 const {context:c,storage}=fixture();let calls=0;storage.set('pending',JSON.stringify([bundle(2000)]));c.online.submitResult=async()=>{calls++;throw Error('offline');};await c.syncResults();assert.equal(calls,1);assert.equal(JSON.parse(storage.get('pending')).length,1);assert.equal(c.syncing,false);
});

test('partial local records never queue or upload a leaderboard score',async()=>{
 const {context:c,storage}=fixture();c.bestTimes=[1200,1500];c.queueBestTimes();assert.equal(storage.has('pending'),false);let calls=0;c.online.submitResult=async()=>calls++;await c.syncResults();assert.equal(calls,0);
});

test('reconnecting restores full server times after an offline startup',async()=>{
 const {context:c,storage}=fixture();c.online.profile=async()=>{throw Error('offline');};await c.syncResults();assert.equal(storage.has('times'),false);
 c.online.profile=async()=>bundle(2500);let submitted;c.online.submitResult=async(token,s)=>submitted=s;await c.syncResults();assert.equal(JSON.parse(storage.get('times')).length,10);assert.equal(submitted.stages[9].timeMs,2500);
});

test('an offline nickname conflict on reconnect asks for another name without losing the local profile',async()=>{
 const {context:c,node}=fixture();c.profile={nickname:'Taken',dirty:true};c.online.createProfile=async()=>{throw Object.assign(Error('taken'),{status:409});};await c.syncResults();assert.equal(c.state.screen,'profile');assert.equal(node('#profileStatus').textContent,'用户名已占用');assert.equal(c.profile.nickname,'Taken');assert.equal(c.syncing,false);
});

test('a read-only sample rename cannot be saved as a dirty offline change',async()=>{
 const {context:c,node,storage}=fixture();c.state.screen='profile';const before={...c.profile};c.online.updateProfile=async()=>{throw Object.assign(Error('read only'),{status:403});};await c.saveProfile({preventDefault(){}});assert.equal(c.state.screen,'profile');assert.deepEqual({...c.profile},before);assert.equal(storage.has('profile'),false);assert.equal(node('#profileStatus').textContent,'这是测试记录，不能修改昵称');assert.equal(node('#saveProfile').disabled,false);
});

test('restoring the same identity refreshes a server-renamed nickname',async()=>{
 const {context:c,node}=fixture();c.profile.nickname='1';c.online.profile=async()=>({profile:{id:'id',nickname:'星海'},...bundle(39700)});c.online.submitResult=async()=>{};await c.syncResults();assert.equal(c.profile.nickname,'星海');assert.equal(node('#profileBtn').textContent,'玩家：星海');
});
