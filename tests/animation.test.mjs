import test from 'node:test';import assert from 'node:assert/strict';import {tntFlash} from '../src/animation.mjs';
test('TNT 从点燃开始闪白，后半段闪烁逐渐加速',()=>{
 function switches(start,end){let last=null,n=0;for(let t=start;t<end;t+=1/240){const on=tntFlash(4-t);if(last!==null&&on!==last)n++;last=on;}return n;}
 assert.equal(tntFlash(4),true);assert.ok(switches(0,1)>=3);assert.ok(switches(3,3.99)>switches(0,1));
});
