import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildLevel, LEVELS } from '../src/levels.mjs';
import { SiegeWorld } from '../src/world.mjs';
const Matter=createRequire(import.meta.url)('../vendor/matter.min.js');

test('十个手工关卡使用完整方块和真实楼梯，装饰不参与承重，怪物开局站稳', () => {
  assert.equal(LEVELS.length,10);
  for(let level=0;level<10;level++){
    const scene=buildLevel(level),g=scene.grid;
    for(let ty=0;ty<18;ty++)for(let tx=0;tx<32;tx++){
      if(scene.visual.roofTiles.has(ty*32+tx)){
        for(let qy=0;qy<2;qy++)for(let qx=0;qx<2;qx++){
          const initial=g.get(tx*16+qx*8,ty*16+qy*8);
          for(let y=0;y<8;y++)for(let x=0;x<8;x++)assert.equal(g.get(tx*16+qx*8+x,ty*16+qy*8+y),initial);
        }
        continue;
      }
      const initial=g.get(tx*16,ty*16);
      for(let y=0;y<16;y++)for(let x=0;x<16;x++)assert.equal(g.get(tx*16+x,ty*16+y),initial,`level ${level}, partial tile ${tx},${ty}`);
    }
    assert.equal(scene.trees.length,1);assert.ok(scene.trees[0].x>28);
    const w=new SiegeWorld(Matter,{grid:g});
    for(const e of scene.enemies)w.addEnemy(e.x,e.feet,e.skin,e);
    const before=g.count();g.set(0,0,1);g.set(0,0,0);w.synchronize();
    for(let i=0;i<480;i++)w.step(1/120);
    assert.equal(g.count(),before,`initial terrain changed in level ${level}`);
    assert.equal(w.debris.length,0,`floating structure in level ${level}`);
    assert.equal(w.enemies.filter(e=>e.alive).length,scene.enemies.length,`enemy spawn overlaps floor in level ${level}`);
    for(let i=0;i<scene.enemies.length;i++)if(scene.enemies[i].stationary){
      const sentry=w.enemies[i];assert.equal(sentry.stationary,true,'level metadata must reach the production actor');
      assert.ok(Math.abs(sentry.body.position.x-scene.enemies[i].x)<.01,'cap sentry must stay centered');
      assert.equal(sentry.turns,0);assert.equal(sentry.walkDistance,0);assert.equal(sentry.behavior,'idle');assert.equal(sentry.pose.walkBlend,0);
    }
  }
});

test('后续关卡包含完整方块台阶、凹地和有真实入口的地窖',()=>{
 const hill=buildLevel(1).grid;assert.equal(hill.get(13*16,12*16),1);assert.equal(hill.get(13*16,13*16),2);
 const s=buildLevel(2);assert.ok(s.enemies.some(e=>e.feet===16*48));
 for(let x=14;x<=28;x++)for(let y=14;y<=15;y++){assert.ok([0,19,20,21].includes(s.grid.get(x*16,y*16)));assert.ok(s.rear.grid.get(x*16,y*16));}
 for(let x=14;x<19;x++)for(let y=14;y<=15;y++)assert.equal(s.grid.get(x*16,y*16),0,'the cellar entrance remains clear');
 assert.equal(s.grid.get(23*16,16*16),3);assert.equal(s.grid.get(23*16,13*16),16);
 const dip=buildLevel(3).grid;assert.equal(dip.get(14*16,14*16),0);assert.equal(dip.get(14*16,16*16),1);
});
