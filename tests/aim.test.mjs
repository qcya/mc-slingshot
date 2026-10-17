import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';import {SiegeWorld} from '../src/world.mjs';import {predictArc,aimAngle,arcRevision} from '../src/aim.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
test('拖到左下方时弹药兜保持左下，不跳回右半边',()=>{
 const angle=aimAngle({x:110,y:660},{x:205,y:607});assert.ok(Math.cos(angle)<0);assert.ok(Math.sin(angle)>0);
});
test('墙体和残骸不吞掉预览，向前、向后和向下始终五个点',()=>{
 const grid=new PixelGrid(300,160);grid.fill(0,128,300,32,7);const w=new SiegeWorld(M,{grid,pixelSize:2});
 const e=w.addDebris(new Uint8Array(16*60).fill(3),16,60,{x:170,y:45}),rev=arcRevision(w),version=grid.version;
 const before=predictArc(w,'cobble',{x:50,y:100},400,0);M.Body.setPosition(e.body,{x:500,y:100});
 assert.equal(grid.version,version);assert.equal(arcRevision(w),rev);
 assert.equal(before.length,5);assert.equal(predictArc(w,'cobble',{x:50,y:100},400,0).length,5);
 for(const [vx,vy] of [[1000,0],[-900,-100],[0,1000],[0,-1100],[.1,0]]){
  const path=predictArc(w,'cobble',{x:280,y:160},vx,vy);assert.equal(path.length,5);assert.ok(path.every(p=>p.x>=0&&p.x<=w.width&&p.y>=0&&p.y<=w.height));
 }
});
test('五点预览最多半秒，由同一 Matter 参数计算，与实际自由飞行位置一致',()=>{
 const grid=new PixelGrid(512,288);grid.fill(0,224,512,64,7);const w=new SiegeWorld(M,{grid});
 const path=predictArc(w,'cobble',{x:260,y:530},850,-400),p=w.spawnProjectile('cobble',260,530,850,-400);
 assert.equal(path.length,5);assert.equal(path.at(-1).step,60);assert.ok(path.at(-1).time<=.5);
 let n=0;for(const point of path){while(n<point.step){w.step(1/120);n++;}assert.ok(Math.hypot(p.body.position.x-point.x,p.body.position.y-point.y)<.1);}
});
