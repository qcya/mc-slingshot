import test from 'node:test';import assert from 'node:assert/strict';import {Renderer} from '../src/renderer.mjs';
test('rendered band endpoints stay on the two annotated binding points in every pull direction',()=>{
 for(const [vx,vy] of [[1000,0],[-1000,0],[0,1000],[0,-1000],[700,700],[-700,-700]]){
  const starts=[],ctx=new Proxy({moveTo(x,y){starts.push({x,y});}},{get:(o,k)=>o[k]||(()=>{})});
  Renderer.prototype.launcher.call({ctx,assets:{images:{slingshot_frame:{}}}}, {ammo:{size:28},pouch:{x:285-vx/10,y:545-vy/10},vx,vy,launch:{},loaded:false},{});
  assert.deepEqual(starts.slice(0,4),[{x:249,y:516},{x:249,y:516},{x:321,y:516},{x:321,y:516}],`${vx}/${vy}`);
 }
});
