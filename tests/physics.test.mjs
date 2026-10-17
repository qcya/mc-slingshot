import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PixelGrid } from '../src/pixels.mjs';
import { SiegeWorld } from '../src/world.mjs';
const Matter=createRequire(import.meta.url)('../vendor/matter.min.js');
const step=(w,seconds)=>{for(let i=0;i<seconds*120;i++) w.step(1/120);};
function fixture(){const grid=new PixelGrid(240,160);grid.fill(0,128,240,32,7);return new SiegeWorld(Matter,{grid,pixelSize:2});}

test('旋转的方块弹药落在真实 Matter 地面后停稳，不下沉', () => {
  const w=fixture(), p=w.spawnProjectile('cobble',100,70,100,0);
  Matter.Body.setAngularVelocity(p.body,0.055);
  step(w,9);
  assert.ok(p.body.bounds.max.y<=257.5,JSON.stringify(p.body.bounds));
  assert.ok(p.body.position.y>220);
  assert.ok(Math.abs(p.body.angularVelocity)<0.002);
  const y=p.body.position.y;step(w,3);
  assert.ok(Math.abs(y-p.body.position.y)<0.5);
  assert.equal(p.body.isSleeping,true);
});

test('两根承重柱必须都断开，屋顶才变成可运动残骸', () => {
  const grid=new PixelGrid(240,160);grid.fill(0,128,240,32,7);
  grid.fill(96,80,16,48,4);grid.fill(144,80,16,48,4);grid.fill(96,64,64,16,10);
  const w=new SiegeWorld(Matter,{grid,pixelSize:2});
  grid.fill(96,112,16,16,0);w.synchronize();
  assert.equal(w.debris.length,0);
  grid.fill(144,112,16,16,0);w.synchronize();
  assert.equal(w.debris.length,1);
  const piece=w.debris[0],before=piece.body.position.y;step(w,.25);
  assert.ok(piece.body.position.y>before+10);
  assert.equal(grid.get(110,70),0);
});

test('TNT 碰撞后有短引信再爆炸，只删除爆炸内具体像素', () => {
  const w=fixture();w.grid.fill(140,40,16,88,4);w.synchronize();
  const p=w.spawnProjectile('tnt',230,210,330,0);
  step(w,.15);assert.ok(w.projectiles.includes(p));assert.equal(w.stats.explosions,0);
  step(w,1);assert.equal(w.stats.explosions,1);assert.ok(w.stats.removed>0);
  assert.ok(w.stats.removed<16*88); // 远离爆心的部分可成为残骸，但不能整柱消失。
});

test('黑洞逐步吞噬并吸引真实刚体，结束后不遗留活动黑洞', () => {
  const w=fixture();w.grid.fill(150,80,16,48,4);w.synchronize();
  w.spawnProjectile('blackhole',260,180,350,0);step(w,.2);
  assert.equal(w.vortices.length,1);
  const removed=w.stats.removed;step(w,.3);
  assert.ok(w.stats.removed>removed);
  assert.ok(w.stats.removed<4000);
  step(w,5);assert.equal(w.vortices.length,0);
  assert.ok(Matter.Composite.allBodies(w.engine.world).every(b=>Number.isFinite(b.position.x)&&Number.isFinite(b.position.y)));
});

test('静态与旋转残骸的孔洞同时更新真实碰撞形状', () => {
  const w=fixture();w.grid.fill(60,80,48,48,5);w.synchronize();
  w.damageDisk(168,208,11,500);w.synchronize();
  assert.equal(Matter.Query.point(Matter.Composite.allBodies(w.engine.world),{x:168,y:208}).length,0);
  assert.ok(Matter.Query.point(Matter.Composite.allBodies(w.engine.world),{x:145,y:208}).length>0);
  const mask=new Uint8Array(32*32).fill(10),e=w.addDebris(mask,32,32,{x:350,y:90},{x:0,y:0},.4,{x:1,y:0},.01);
  const p=w.worldPoint(e,16,16);w.damageDisk(p.x,p.y,8,500);
  assert.equal(Matter.Query.point(Matter.Composite.allBodies(w.engine.world),p).length,0);
  const count=w.debris.filter(e=>!e.dead).reduce((n,e)=>n+e.count,0);
  assert.ok(count<1024&&count>900);
});

test('完整物理引擎中珍珠穿薄墙，厚墙阻挡', () => {
  for(const [width,expected] of [[16,1],[48,0]]){
    const w=fixture();w.grid.fill(140,60,width,68,5);w.synchronize();
    const p=w.spawnProjectile('ender',220,190,600,0);step(w,.32);
    assert.equal(w.stats.portals,expected,`wall cells=${width}`);
    if(expected)assert.ok(p.body.position.x>312);else assert.ok(p.body.position.x<280);
  }
});

test('怪物从高处坠落会受有限数值伤害，轻碎屑碰撞不秒杀', () => {
  const w=fixture(),e=w.addEnemy(100,95);step(w,1.5);
  assert.ok(Number.isFinite(e.hp));assert.equal(e.alive,false);
});
