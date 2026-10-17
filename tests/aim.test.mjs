import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';import {SiegeWorld} from '../src/world.mjs';import {predictArc,aimAngle,arcRevision} from '../src/aim.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
test('拖到左下方时弹药兜保持左下，不跳回右半边',()=>{
 const angle=aimAngle({x:110,y:660},{x:205,y:607});assert.ok(Math.cos(angle)<0);assert.ok(Math.sin(angle)>0);
});
test('残骸移动而地形未变化时，预测遮挡条件仍会刷新',()=>{
 const grid=new PixelGrid(300,160);grid.fill(0,128,300,32,7);const w=new SiegeWorld(M,{grid,pixelSize:2});
 const e=w.addDebris(new Uint8Array(16*60).fill(3),16,60,{x:170,y:45}),rev=arcRevision(w),version=grid.version;
 const before=predictArc(w,'cobble',{x:50,y:100},400,0);M.Body.setPosition(e.body,{x:500,y:100});
 assert.equal(grid.version,version);assert.notEqual(arcRevision(w),rev);
 assert.ok(predictArc(w,'cobble',{x:50,y:100},400,0).length>before.length);
});
test('预览由同一 Matter 参数计算，且只显示碰撞前半程',()=>{
 const grid=new PixelGrid(512,288);grid.fill(0,224,512,64,7);const w=new SiegeWorld(M,{grid});
 const path=predictArc(w,'cobble',{x:260,y:530},850,-400),p=w.spawnProjectile('cobble',260,530,850,-400);
 assert.ok(path.length>=2&&path.at(-1).time<.7);
 let n=0;for(const point of path){while(n<point.step){w.step(1/120);n++;}assert.ok(Math.hypot(p.body.position.x-point.x,p.body.position.y-point.y)<.1);}
});
