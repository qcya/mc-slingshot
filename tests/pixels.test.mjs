import test from 'node:test';
import assert from 'node:assert/strict';
import { PixelGrid, meshPixels, components, findSafeExit, impactDamage } from '../src/pixels.mjs';

test('完整方块包含 256 像素，破坏不补回已删除像素，基岩不可删除', () => {
  const g = new PixelGrid(48, 32);
  g.tile(0, 0, 4); g.tile(1, 0, 7);
  assert.equal(g.count(), 512);
  assert.equal(g.damageDisk(8, 8, 3, 200), 32);
  const remaining = g.count();
  g.damageDisk(8, 8, 2, 200);
  assert.equal(g.count(), remaining);
  g.damageDisk(24, 8, 30, 1e8);
  assert.equal(g.get(24, 8), 7);
});

test('碰撞矩形精确覆盖剩余像素，孔洞不产生幽灵碰撞', () => {
  const mask = Uint8Array.from([4,4,4,4, 4,0,0,4, 4,0,0,4, 4,4,4,4]);
  const rects = meshPixels(mask, 4, 4), covered = new Uint8Array(16);
  for (const r of rects) for (let y=r.y;y<r.y+r.h;y++) for (let x=r.x;x<r.x+r.w;x++) covered[y*4+x]++;
  assert.deepEqual([...covered], [1,1,1,1, 1,0,0,1, 1,0,0,1, 1,1,1,1]);
});

test('断裂按四邻接分离，角落接触不构成承重', () => {
  const mask = Uint8Array.from([4,4,0, 0,0,4, 4,0,4]);
  assert.deepEqual(components(mask,3,3).map(c=>c.length).sort(), [1,2,2]);
});

test('珍珠测量实际墙厚并寻找完整安全出口', () => {
  const thin=(x,y)=>x>=40&&x<56&&y>=0&&y<100;
  const exit=findSafeExit(thin,{x:32,y:40},{x:1,y:0},3,20,1);
  assert.ok(exit && exit.x>=59 && exit.x<62);
  assert.equal(findSafeExit((x,y)=>x>=40&&x<72,{x:32,y:40},{x:1,y:0},3,20,1),null);
  // 第二堵墙与第一堵之间不足以容纳完整珍珠，不能跳过它冒充安全出口。
  assert.equal(findSafeExit((x,y)=>(x>=40&&x<56)||(x>=59&&x<90),{x:32,y:40},{x:1,y:0},3,20,1),null);
});

test('轻微接触不伤怪物，高速重物可致命', () => {
  assert.equal(impactDamage(50,0.02,1),0);
  assert.equal(impactDamage(50,40,1),0);
  assert.ok(impactDamage(700,4,1)>100);
  assert.ok(impactDamage(700,0.02,1)<15);
  assert.equal(impactDamage(700,Infinity,1),245);
});
