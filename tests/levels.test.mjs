import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildLevel, LEVELS } from '../src/levels.mjs';
import { SiegeWorld } from '../src/world.mjs';
const Matter=createRequire(import.meta.url)('../vendor/matter.min.js');

test('五个手工关卡从完整方块起步，装饰不参与承重，怪物开局站稳', () => {
  assert.equal(LEVELS.length,5);
  for(let level=0;level<5;level++){
    const scene=buildLevel(level),g=scene.grid;
    for(let ty=0;ty<18;ty++)for(let tx=0;tx<32;tx++){
      const initial=g.get(tx*16,ty*16);
      for(let y=0;y<16;y++)for(let x=0;x<16;x++)assert.equal(g.get(tx*16+x,ty*16+y),initial,`level ${level}, partial tile ${tx},${ty}`);
    }
    assert.equal(scene.trees.length,1);assert.ok(scene.trees[0].x>28);
    const w=new SiegeWorld(Matter,{grid:g});
    for(const e of scene.enemies)w.addEnemy(e.x,e.feet,e.skin);
    const before=g.count();g.set(0,0,1);g.set(0,0,0);w.synchronize();
    for(let i=0;i<480;i++)w.step(1/120);
    assert.equal(g.count(),before,`initial terrain changed in level ${level}`);
    assert.equal(w.debris.length,0,`floating structure in level ${level}`);
    assert.equal(w.enemies.filter(e=>e.alive).length,scene.enemies.length,`enemy spawn overlaps floor in level ${level}`);
  }
});
