import test from 'node:test';
import assert from 'node:assert/strict';
import {createOnlineClient} from '../src/online.mjs';
test('local file preview does not make profile or leaderboard HTTP requests',async()=>{
 let requests=0;const client=createOnlineClient({offline:true,fetchImpl:async()=>{requests++;throw Error('network should not run');}});
 for(const request of [()=>client.createProfile('Local tester'),()=>client.updateProfile('local','Renamed'),()=>client.profile('local'),()=>client.leaderboard('end'),()=>client.submitResult('local',{},'nether')])await assert.rejects(request,{status:0});
 assert.equal(requests,0);
});
