import test from 'node:test';import assert from 'node:assert/strict';
import {actorState,animateActor} from '../src/behavior.mjs';
test('single-block sentries keep their feet still while looking around smoothly',()=>{
 const e={id:1,stationary:true,facing:1,...actorState(1,0)},head=[];
 for(let i=0;i<1200;i++){assert.equal(animateActor(e,i/120,1/120,true),false);assert.equal(e.pose.walkBlend,0);assert.equal(e.facing,1);head.push(e.pose.headYaw);}
 assert.ok(Math.max(...head)-Math.min(...head)>.1);assert.ok(head.slice(1).every((v,i)=>Math.abs(v-head[i])<.01));
});
