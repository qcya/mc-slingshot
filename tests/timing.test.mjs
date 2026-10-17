import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeTimes,recordBestTime,timeBundle,parseTimeBundle,formatTime} from '../src/timing.mjs';
test('only a faster clear replaces the per-stage personal best',()=>{
 let times=normalizeTimes(null);times=recordBestTime(times,0,4500);times=recordBestTime(times,0,6000);assert.equal(times[0],4500);
 times=recordBestTime(times,0,4200);assert.equal(times[0],4200);assert.equal(timeBundle(times),null);
});
test('a score bundle exists only after all ten stages have valid times and contains no shot counts',()=>{
 let times=normalizeTimes(null);for(let i=0;i<9;i++)times=recordBestTime(times,i,1000+i);assert.equal(timeBundle(times),null);
 times=recordBestTime(times,9,2000);const b=timeBundle(times);assert.equal(b.stages.length,10);assert.deepEqual(b.stages[0],{stage:0,timeMs:1000});assert.equal(b.stages.reduce((n,s)=>n+s.timeMs,0),11036);
 assert.deepEqual(parseTimeBundle(b),b);assert.equal(parseTimeBundle({stages:b.stages.slice(1)}),null);assert.equal(parseTimeBundle({stages:b.stages.map(()=>b.stages[0])}),null);
});
test('invalid saved times do not unlock submission and millisecond precision is visible',()=>{
 assert.equal(timeBundle(normalizeTimes([NaN,-1,0,100,Infinity,'1000'])),null);assert.equal(formatTime(65432),'01:05.432');assert.equal(formatTime(600000),'10:00.000');
});
