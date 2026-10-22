import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';
import {SiegeWorld} from '../src/world.mjs';
import {freezeEnemy} from '../src/combat.mjs';
import {advanceFire,splashWater} from '../src/fire.mjs';
import {MOB_PROFILES} from '../src/combat.mjs';
import {updateOutcome} from '../src/outcome.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function fixture(lavaSources=[]){const grid=new PixelGrid(256,160);grid.fill(0,128,256,32,7);const w=new SiegeWorld(M,{grid,lavaSources});w.engine.gravity.y=0;return w;}
function flow(w,seconds=3){for(let i=0;i<seconds*120;i++){w.time+=1/120;w.lava.advance();advanceFire(w);}}
function enemyAt(w,x,y,skin='zombie'){const e=w.addEnemy(x,384,skin,{stationary:true});M.Body.setPosition(e.body,{x,y});M.Body.setStatic(e.body,true);return e;}

test('one bucket places one 48px source above the impacted floor and repeated contacts cannot duplicate it',()=>{
 const w=fixture(),before=w.grid.cells.slice();const source=w.lava.pourBucket(288,384,{normal:{x:0,y:-1},sourceId:'bucket:1'});
 assert.ok(source);assert.equal(source.potent,true);assert.equal(source.y*12+48,384);assert.ok(source.x*12<=288&&source.x*12+48>=288);
 assert.equal(w.lava.pourBucket(300,384,{normal:{x:0,y:-1},sourceId:'bucket:1'}),source);assert.equal(w.lava.sources.length,1);
 w.lava.advance();assert.equal(w.lava.cells.size,16);assert.deepEqual(w.grid.cells,before);
 assert.deepEqual(w.events.filter(e=>e.sound==='bucket_empty_lava').map(e=>[e.x,e.y]),[[288,384]]);
});

test('bucket flowing down real terrain stops at a dam then drains through a broken opening',()=>{
 const w=fixture();w.grid.fill(64,64,64,4,3);w.grid.fill(64,32,4,32,3);w.grid.fill(124,32,4,32,3);
 const s=w.lava.pourBucket(288,192,{normal:{x:0,y:-1},sourceId:'bucket:dam'});assert.ok(s);flow(w);
 assert.ok([...w.lava.cells.values()].every(c=>c.y<192));
 w.grid.fill(88,64,16,4,0);flow(w);
 assert.ok([...w.lava.cells.values()].some(c=>c.y>204&&c.potent));
 for(const c of w.lava.cells.values())for(let y=c.gy*4;y<c.gy*4+4;y++)for(let x=c.gx*4;x<c.gx*4+4;x++)assert.equal(w.grid.get(x,y),0);
});

test('bucket source stays on the exposed side of walls and ceilings instead of seeding inside them',()=>{
 for(const [x,y,normal,check]of [[288,216,{x:-1,y:0},s=>s.x*12+48<=288],[288,216,{x:1,y:0},s=>s.x*12>=288],[288,192,{x:0,y:1},s=>s.y*12>=192]]){
  const w=fixture();if(normal.x)w.grid.fill(92,0,8,128,3);else w.grid.fill(0,56,256,8,3);
  const s=w.lava.pourBucket(x,y,{normal,sourceId:'bucket:surface'});assert.ok(s);assert.ok(check(s));w.lava.advance();
  for(const c of w.lava.cells.values())assert.equal(w.sample(c.x+6,c.y+6),0);
 }
});

test('real foreground debris blocks bucket flow until the obstruction moves away',()=>{
 const w=fixture();w.grid.fill(64,32,4,96,3);w.grid.fill(100,32,4,96,3);
 const dam=w.addDebris(new Uint8Array(36*4).fill(3),36,4,{x:68*3,y:64*3});M.Body.setStatic(dam.body,true);
 assert.ok(w.lava.pourBucket(252,192,{normal:{x:0,y:-1},sourceId:'bucket:debris'}));flow(w);
 assert.ok([...w.lava.cells.values()].every(c=>c.y<192));M.Body.setPosition(dam.body,{x:600,y:100});flow(w);
 assert.ok([...w.lava.cells.values()].some(c=>c.y>204));
});

test('a 36px cavity clips the source at the impact instead of teleporting lava through a wall',()=>{
 const w=fixture();w.grid.fill(80,28,4,100,3);w.grid.fill(96,28,4,100,3);w.grid.fill(80,28,20,4,3);
 const s=w.lava.pourBucket(270,384,{normal:{x:0,y:-1},sourceId:'bucket:cavity'});assert.ok(s);w.lava.advance();
 assert.ok(w.lava.cells.size>0&&w.lava.cells.size<16);
 flow(w);assert.ok([...w.lava.cells.values()].every(c=>c.x>=252&&c.x+c.size<=288&&c.y>=96&&c.y+c.size<=384));
});

test('a thin wall splitting the source footprint cannot seed its disconnected far side',()=>{
 const w=fixture();w.grid.fill(84,0,1,128,3);
 assert.ok(w.lava.pourBucket(276,384,{normal:{x:0,y:-1},sourceId:'bucket:thin'}));flow(w);
 assert.ok([...w.lava.cells.values()].every(c=>c.x>=264),'all source and flowing cells remain right of the struck-side wall');
});

test('fluid leaving an open world bottom does not spread across a phantom floor',()=>{
 const w=new SiegeWorld(M,{grid:new PixelGrid(64,64)});
 assert.ok(w.lava.pourBucket(96,48,{normal:{x:0,y:-1},sourceId:'bucket:void'}));flow(w,3);
 const bottom=[...w.lava.cells.values()].filter(c=>c.y===180);
 assert.equal(bottom.length,4);assert.ok(bottom.every(c=>c.x>=72&&c.x<120));
});

test('map and bucket flow merging retains bucket potency even when the map source was inserted first',()=>{
 const w=fixture([{x:5,y:5}]);flow(w);const ordinary=enemyAt(w,264,360,'zombified_piglin');flow(w,.3);assert.equal(ordinary.hp,100);assert.equal(ordinary.bucketBurn,undefined);
 const s=w.lava.pourBucket(264,288,{normal:{x:0,y:-1},sourceId:'bucket:merge'});assert.ok(s);flow(w,.8);
 const merged=[...w.lava.cells.values()].find(c=>c.sourceIds.has(0)&&c.sourceIds.has('bucket:merge'));
 assert.ok(merged?.potent);assert.ok(ordinary.bucketBurn);flow(w,1.3);assert.equal(ordinary.alive,false);
});

test('bucket potency reaches a distant existing map pool only when the descending front arrives',()=>{
 const w=fixture([{x:5,y:7}]);flow(w);const e=enemyAt(w,264,360,'zombified_piglin'),start=w.time;
 assert.ok(w.lava.pourBucket(264,96,{normal:{x:0,y:-1},sourceId:'bucket:front'}));flow(w,1.2);
 assert.equal(e.bucketBurn,undefined);assert.equal(e.hp,100);
 assert.ok([...w.lava.cells.values()].filter(c=>c.y>=336).every(c=>!c.potent),'the old pool cannot transport future provenance instantly');
 while(!e.bucketBurn&&w.time-start<5)flow(w,.13);
 assert.ok(e.bucketBurn);assert.ok(w.time-start>=2,'12px cells advance one edge each .12s');
});

test('a fast moving enemy touching bucket lava between fluid updates keeps burning after it exits',()=>{
 const grid=new PixelGrid(1024,160);grid.fill(0,128,1024,32,7);
 const w=new SiegeWorld(M,{grid});w.engine.gravity.y=0;
 w.lava.pourBucket(288,384,{sourceId:'bucket:brief'});w.lava.advance();
 const e=w.addEnemy(210,380,'zombified_piglin');e.externalUntil=5;M.Body.setVelocity(e.body,{x:26,y:0});
 const overlaps=()=>[...w.lava.cells.values()].some(c=>c.potent&&e.body.bounds.max.x>c.x&&e.body.bounds.min.x<c.x+c.size&&e.body.bounds.max.y>c.y&&e.body.bounds.min.y<c.y+c.size);
 let touchFrames=0;for(let i=0;i<15;i++){w.step(1/120);if(overlaps())touchFrames++;}
 assert.ok(touchFrames>0,'real Matter motion crosses the lava');assert.equal(overlaps(),false,'the enemy already exited before the next propagation update');
 assert.ok(e.bucketBurn);assert.equal(e.hp,100);assert.ok(e.burningUntil>w.time);
 const exitX=e.body.position.x;
 while(e.alive&&w.time<1.5){w.step(1/120);assert.equal(overlaps(),false);if(e.alive)assert.ok(e.burningUntil>w.time);}
 assert.equal(e.alive,false);assert.equal(e.hp,0);assert.ok(e.body.position.x>exitX);assert.ok(e.body.position.x<w.width);
 assert.equal(w.stats.enemyDamage,100,'the two persistent burn ticks kill it while still in bounds');
});

for(const skin of ['zombie','hoglin','zombified_piglin','wither_skeleton','ender_dragon'])test(`${skin} stays visibly bucket-burning after leaving, water and freezing until it dies`,()=>{
 const w=fixture();assert.ok(w.lava.pourBucket(264,384,{normal:{x:0,y:-1},sourceId:'bucket:burn'}));w.lava.advance();const e=enemyAt(w,264,360,skin);flow(w,.13);assert.ok(e.bucketBurn);assert.ok(e.burningUntil>w.time);
 M.Body.setPosition(e.body,{x:600,y:100});splashWater(w,600,100);assert.ok(e.burningUntil>w.time);freezeEnemy(w,e);advanceFire(w);assert.equal(e.frozen,false);assert.ok(e.burningUntil>w.time);
 const hp=e.hp;flow(w,.6);assert.equal(e.hp,hp-50);assert.ok(e.burningUntil>w.time);
 flow(w,10);assert.equal(e.alive,false);assert.equal(e.burningUntil,0);
});

test('direct bucket contact latches immediately and Wither retains its three effective attacks and summons',()=>{
 const w=fixture(),e=enemyAt(w,500,200,'wither');w.lava.pourBucket(480,240,{normal:{x:-1,y:0},sourceId:'bucket:wither',enemy:e});assert.ok(e.bucketBurn);assert.equal(e.hp,450);
 flow(w,1.81);assert.equal(e.alive,false);assert.equal(w.enemies.filter(e=>e.skin==='wither_skeleton').length,3);
});

test('ordinary map lava still deals its usual damage and never latches permanent bucket burn',()=>{
 const w=fixture([{x:5,y:7}]);flow(w);const e=enemyAt(w,264,360,'hoglin');w.time+=.13;w.lava.advance();assert.equal(e.hp,250);assert.equal(e.bucketBurn,undefined);
 M.Body.setPosition(e.body,{x:600,y:100});flow(w,3);assert.equal(e.hp,250);
});

test('cooled bucket sources cannot respawn from duplicate impact callbacks and invalid impacts make no source',()=>{
 const w=fixture(),s=w.lava.pourBucket(264,384,{sourceId:'bucket:once'});w.lava.advance();w.lava.cool(264,360,60);assert.equal(s.active,false);
 assert.equal(w.lava.pourBucket(264,384,{sourceId:'bucket:once'}),s);flow(w);assert.equal(w.lava.cells.size,0);assert.equal(w.lava.sources.length,1);
 for(const [i,x,y]of [[1,NaN,100],[2,-1,100],[3,100,Infinity],[4,800,100]])assert.equal(w.lava.pourBucket(x,y,{sourceId:`bad:${i}`}),null);
 assert.equal(w.lava.sources.length,1);
});

test('every enemy profile can be killed by the deliberate special bucket burn',()=>{
 for(const skin of Object.keys(MOB_PROFILES)){
  const w=fixture(),e=enemyAt(w,600,100,skin);w.lava.pourBucket(264,384,{sourceId:`bucket:${skin}`,enemy:e});flow(w,20);
  assert.equal(e.alive,false,skin);assert.equal(e.burningUntil,0,skin);
 }
});

test('last-shot outcome waits for an off-lava burning boss to die after its source has cooled',()=>{
 const w=fixture(),e=enemyAt(w,600,100,'ender_dragon');w.lava.pourBucket(264,384,{sourceId:'bucket:last',enemy:e});w.lava.advance();w.lava.cool(264,360,96);
 const state={shots:0,launch:null,quiet:0,winWait:0};let result=null;
 for(let i=0;i<1200&&result===null;i++){w.step(1/120);result=updateOutcome(state,w,1/120);if(e.alive){assert.equal(result,null);assert.equal(w.active(),true);}}
 assert.equal(e.alive,false);assert.equal(result,true);
});
