import test from 'node:test';import assert from 'node:assert/strict';import {driftingClouds} from '../src/scenery.mjs';
test('clouds drift every rendered frame instead of jumping between pixel steps',()=>{
 const xAt=time=>{const xs=[];driftingClouds({fillRect:x=>xs.push(x)},time);return xs[0];};
 for(let frame=1;frame<=60;frame++){const movement=xAt(frame/60)-xAt((frame-1)/60);assert.ok(movement>0&&movement<.2,`frame ${frame}: ${movement}`);}
});
