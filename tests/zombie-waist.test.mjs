import test from 'node:test';import assert from 'node:assert/strict';import{mobGeometry}from'../src/mobs.mjs';
test('zombie torso uses the 8x12x4 skin box without sampling the transparent rows below the shirt',()=>{
 for(const facing of [-1,1])for(const phase of [0,.5,1.2,2.4,4.7]){
  const body=mobGeometry('zombie',phase,facing).filter(f=>f.part==='body');assert.ok(body.length>=2);
  for(const f of body){const[u,v,w,h]=f.uv;assert.ok(v+h<=32,`${f.face} torso UV ${f.uv} crosses the base skin boundary`);if(f.face==='front')assert.deepEqual(f.uv,[20,20,8,12]);}
 }
});
