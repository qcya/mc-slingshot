import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
// Execute the actual application functions with controlled storage/network/DOM.
const functions=source.slice(source.indexOf('function readLocal('),source.indexOf('async function showLeaderboard('));
function fixture(){
 const storage=new Map(),nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',value:'新昵称',disabled:false,classList:{toggle(){}}});return nodes.get(id);};
 const context=vm.createContext({console,queueMicrotask,PROFILE_KEY:'profile',PENDING_KEY:'pending',profile:{id:'id',token:'token',nickname:'旧昵称'},profileRevision:0,profileReturn:'levels',syncing:false,state:{screen:'levels'},online:{},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},$:node,cancelDrag(){},menus(screen){context.state.screen=screen;}});
 vm.runInContext(functions,context);return {context,storage,node};
}
test('a victory queued while an older score uploads is drained without needing another win or reload',async()=>{
 const {context:c,storage}=fixture(),submitted=[];let release;
 storage.set('pending',JSON.stringify([{stage:0,shots:4,timeMs:5000}]));
 c.online.submitResult=async(token,score)=>{submitted.push(score.stage);if(submitted.length===1)await new Promise(r=>release=r);};
 const sync=c.syncResults();await Promise.resolve();storage.set('pending',JSON.stringify([{stage:0,shots:4,timeMs:5000},{stage:1,shots:3,timeMs:6000}]));await c.syncResults();release();await sync;
 assert.deepEqual(submitted,[0,1]);assert.equal(storage.get('pending'),'[]');
});
test('late nickname response preserves a game started after leaving the profile window',async()=>{
 const {context:c,node}=fixture();let release;c.state.screen='profile';c.online.updateProfile=()=>new Promise(r=>release=r);
 const save=c.saveProfile({preventDefault(){}});c.state.screen='play';release({profile:{id:'id',nickname:'新昵称'}});await save;
 assert.equal(c.state.screen,'play');assert.equal(c.profile.nickname,'新昵称');assert.equal(node('#saveProfile').disabled,false);
});
test('failed score upload leaves the score queued and stops instead of retrying forever',async()=>{
 const {context:c,storage}=fixture();let calls=0;storage.set('pending',JSON.stringify([{stage:0,shots:1,timeMs:2000}]));c.online.submitResult=async()=>{calls++;throw Error('offline');};await c.syncResults();assert.equal(calls,1);assert.equal(JSON.parse(storage.get('pending')).length,1);assert.equal(c.syncing,false);
});
