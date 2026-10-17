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

test('TNT 固定四秒引信，撞击木材不挖洞，爆炸才破坏具体像素', () => {
  const w=fixture();w.grid.fill(140,40,16,88,4);w.synchronize();
  const p=w.spawnProjectile('tnt',230,210,330,0);
  step(w,1);assert.ok(w.projectiles.includes(p));assert.equal(w.stats.explosions,0);assert.equal(w.stats.removed,0);
  step(w,3.3);assert.equal(w.stats.explosions,1);assert.ok(w.stats.removed>0);
  assert.ok(w.stats.removed<16*88); // 远离爆心的部分可成为残骸，但不能整柱消失。
});

test('圆石与珍珠直接碰怪击杀，TNT 接触不伤怪、爆炸才伤怪', () => {
  for(const kind of ['cobble','tnt','ender']){
    const w=fixture(),e=w.addEnemy(160,256);w.spawnProjectile(kind,125,210,80,0);step(w,.35);
    assert.equal(e.alive,kind==='tnt',kind);
    if(kind==='tnt'){assert.equal(e.hp,100);w.blast(e.body.position.x,e.body.position.y);assert.equal(e.alive,false);}
  }
});

test('珍珠不会损伤门、玻璃或石墙，包括穿墙失败和已用过穿墙的撞击',()=>{
  for(const material of [17,18,6,5])for(const width of [16,48])for(const uses of [0,1]){
    const w=fixture();w.grid.fill(140,45,width,83,material);w.synchronize();
    const before=w.grid.cells.slice(),hp=w.grid.hp.slice(),p=w.spawnProjectile('ender',220,190,900,0);p.uses=uses;
    step(w,.45);assert.deepEqual(w.grid.cells,before,`${material}/${width}/${uses}`);assert.deepEqual(w.grid.hp,hp);
    assert.equal(w.stats.removed,0);assert.equal(w.stats.backgroundRemoved,0);
  }
});

test('TNT 接触可碎玻璃，不能接触打碎木材或石头', () => {
  for(const material of [4,5,6]){
    const w=fixture();w.grid.fill(140,80,16,48,material);w.synchronize();
    w.spawnProjectile('tnt',250,205,300,0);step(w,.3);
    if(material===6)assert.ok(w.stats.removed>0);else assert.equal(w.stats.removed,0);
    assert.equal(w.stats.explosions,0);
  }
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
  for(const [width,expected] of [[16,1],[48,1],[72,0]]){
    const w=fixture();w.grid.fill(140,60,width,68,5);w.synchronize();
    const p=w.spawnProjectile('ender',220,190,600,0);step(w,.32);
    assert.equal(w.stats.portals,expected,`wall cells=${width}`);
    if(expected)assert.ok(p.body.position.x>(140+width)*2+14);else assert.ok(p.body.position.x<280);
  }
});

test('怪物从高处坠落会受有限数值伤害，轻碎屑碰撞不秒杀', () => {
  const w=fixture(),e=w.addEnemy(100,95);step(w,1.5);
  assert.ok(Number.isFinite(e.hp));assert.equal(e.alive,false);
});

test('实际刚体碰撞中沉重石块能压死怪物，轻小碎片不会', () => {
  for(const [size,lethal] of [[16,true],[3,false]]){
    const w=fixture(),e=w.addEnemy(100,256);
    w.addDebris(new Uint8Array(size*size).fill(3),size,size,{x:100-size,y:20},{x:0,y:0},0,{x:0,y:5});step(w,1.5);
    assert.equal(e.alive,!lethal,`debris size ${size}`);
  }
});

test('像素破坏预算对地形和所有残骸合计生效', () => {
  const w=fixture();w.grid.fill(60,80,48,48,5);w.synchronize();
  w.addDebris(new Uint8Array(256).fill(10),16,16,{x:220,y:190});
  assert.equal(w.damageDisk(210,208,50,500,{budget:10}),10);
});

test('静止弹药脚下的泥土被挖掉后重新下落', () => {
  const grid=new PixelGrid(240,160);grid.fill(0,128,240,16,2);grid.fill(0,144,240,16,7);
  const w=new SiegeWorld(Matter,{grid,pixelSize:2}),p=w.spawnProjectile('cobble',100,240,0,0);step(w,3);
  assert.equal(p.body.isSleeping,true);const y=p.body.position.y;
  grid.fill(40,128,32,16,0);w.synchronize();step(w,.5);
  assert.ok(p.body.position.y>y+20);
});
test('翻倒长梁的旋转端点可造成伤害，不能只看重心速度',()=>{
 const w=fixture(),e=w.addEnemy(300,256);
 w.addDebris(new Uint8Array(100*8).fill(3),100,8,{x:292,y:140},{x:0,y:0},0,{x:0,y:0},-.15);
 for(let i=0;i<20;i++)w.step(1/120);
 assert.ok(e.hp<100,`hp=${e.hp}`);
});
