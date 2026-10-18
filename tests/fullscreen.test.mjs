import test from 'node:test';import assert from 'node:assert/strict';import {enterLandscape,exitLandscape} from '../src/fullscreen.mjs';
test('Toy mobile fullscreen uses its native landscape immersive container API',async()=>{
 const calls=[],messages=[];const result=await enterLandscape({isToy:true,sdk:{setContainerMode:async options=>calls.push(options)},onStatus:text=>messages.push(text)});
 assert.equal(result,'native');assert.deepEqual(calls,[{orientation:'landscape',immersive:true}]);assert.equal(messages.at(-1),'');
});
test('leaving native or browser fullscreen restores the container and releases orientation',async()=>{
 const calls=[];assert.equal(await exitLandscape({isNative:true,sdk:{setContainerMode:async opts=>calls.push(opts)}}),'native');assert.deepEqual(calls,[{orientation:'landscape',immersive:false}]);calls.length=0;
 assert.equal(await exitLandscape({doc:{fullscreenElement:{},exitFullscreen:async()=>calls.push('exit')},display:{orientation:{unlock:()=>calls.push('unlock')}}}),'browser');assert.deepEqual(calls,['exit','unlock']);
});
test('a web Toy falls back to browser fullscreen, then locks orientation',async()=>{
 const calls=[];const result=await enterLandscape({isToy:true,sdk:{setContainerMode:async()=>{throw Error('unsupported');}},doc:{documentElement:{requestFullscreen:async()=>calls.push('fullscreen')}},display:{orientation:{lock:async value=>calls.push(value)}}});
 assert.equal(result,'browser');assert.deepEqual(calls,['fullscreen','landscape']);
});
test('denied fullscreen and rotation locks give actionable visible feedback',async()=>{
 const messages=[];assert.equal(await enterLandscape({doc:{documentElement:{}},onStatus:text=>messages.push(text)}),'manual');assert.match(messages.at(-1),/未允许自动全屏/);
 assert.equal(await enterLandscape({doc:{fullscreenElement:{},documentElement:{}},display:{orientation:{lock:async()=>{throw Error('locked');}}},onStatus:text=>messages.push(text)}),'fullscreen');assert.match(messages.at(-1),/关闭系统旋转锁/);
});
