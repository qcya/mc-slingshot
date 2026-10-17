import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';import {SiegeWorld} from '../src/world.mjs';import {buildLevel} from '../src/levels.mjs';import {predictArc} from '../src/aim.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js'),step=(w,t)=>{for(let i=0;i<t*120;i++)w.step(1/120);};
function floor(){const grid=new PixelGrid(300,180);grid.fill(0,144,300,36,7);return new SiegeWorld(M,{grid,pixelSize:2});}
test('炸断所有承重柱后，房屋与后墙剩余像素仍固定，不生成房屋刚体',()=>{
 const s=buildLevel(0),w=new SiegeWorld(M,{grid:s.grid,rear:s.rear}),roof=s.grid.get(24*16,5*16),rear=s.rear.grid.count();
 w.grid.fill(20*16,10*16,16,3*16,0);w.grid.fill(28*16,10*16,16,3*16,0);w.synchronize();step(w,2);
 assert.equal(w.grid.get(24*16,5*16),roof);assert.equal(w.debris.length,0);assert.equal(w.rear.grid.count(),rear);
});
test('TNT 和圆石轻碰即打碎整块玻璃，且能够继续穿过',()=>{
 for(const kind of ['cobble','tnt']){
  const w=floor();w.grid.tile(7,7,6);w.synchronize();const p=w.spawnProjectile(kind,200,210,150,0);step(w,.65);
  assert.equal(w.grid.get(120,120),0,kind);assert.equal(w.stats.removed,256,kind);assert.ok(p.body.position.x>245,kind);
 }
});
test('圆石能连续打穿多块玻璃，不按玻璃耐久和最低速度阻挡',()=>{
 const w=floor();for(let y=6;y<=8;y++)for(let x=7;x<=9;x++)w.grid.tile(x,y,6);w.synchronize();
 const p=w.spawnProjectile('cobble',200,232,500,0);step(w,.42);assert.ok(p.body.position.x>320);assert.ok(w.stats.removed>=3*256);
});
test('先爆的 TNT 会炸飞后一颗 TNT 和落地睡眠圆石，引信不被重置',()=>{
 const w=floor(),stone=w.spawnProjectile('cobble',330,272,0,0);step(w,2);assert.equal(stone.body.isSleeping,true);
 const tnt=w.spawnProjectile('tnt',270,272,0,0);step(w,.8);const fuse=tnt.fuse,x=tnt.body.position.x;
 w.blast(230,270,98);step(w,.25);
 assert.ok(tnt.body.position.x>x+15);assert.ok(stone.body.position.x>345);assert.ok(tnt.fuse<fuse&&tnt.fuse>fuse-.4);
});
test('只有两侧樱花树，树木不进入预览碰撞列表',()=>{
 const scene=buildLevel(0);assert.equal(scene.trees.length,2);assert.ok(scene.trees.every(t=>t.kind==='cherry'&&(t.x<4||t.x>28)));
 const w=new SiegeWorld(M,{grid:scene.grid,rear:scene.rear}),p=predictArc(w,'cobble',{x:205,y:545},1100,-500);
 assert.equal(M.Query.point(M.Composite.allBodies(w.engine.world),{x:11*48+24,y:11*48}).length,0);
 w.scene={trees:[{x:8,base:14,height:10,kind:'cherry'}]};assert.deepEqual(predictArc(w,'cobble',{x:205,y:545},1100,-500),p);
});
