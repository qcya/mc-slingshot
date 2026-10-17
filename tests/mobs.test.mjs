import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';import {SiegeWorld} from '../src/world.mjs';import {mobGeometry} from '../src/mobs.mjs';
import {mobAppearance} from '../src/animation.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');

test('受伤红闪，死亡先倒地、随后仅发出一次白色消散事件并移除碰撞',()=>{
 const grid=new PixelGrid(240,160);grid.fill(0,128,240,32,7);const w=new SiegeWorld(M,{grid,pixelSize:2}),e=w.addEnemy(200,256);
 w.hurt(e,20);assert.ok(e.hurtUntil>w.time);assert.equal(e.alive,true);
 w.hurt(e,250);assert.equal(e.alive,false);assert.equal(e.dead,undefined);
 assert.equal(mobAppearance(e,w.time).hurt,true);assert.equal(mobAppearance(e,w.time+.31).hurt,false);
 assert.ok(Math.abs(mobAppearance(e,w.time+.5).angle)>=Math.PI/2-.01);
 for(let i=0;i<50;i++)w.step(1/120);assert.ok(!e.dead,'corpse must remain for the topple');
 for(let i=0;i<40;i++)w.step(1/120);assert.equal(e.dead,true);assert.equal(w.events.filter(v=>v.type==='death').length,1);
 assert.ok(!M.Composite.allBodies(w.engine.world).includes(e.body));
 for(let i=0;i<180;i++)w.step(1/120);assert.equal(w.events.filter(v=>v.type==='death').length,1);
});
test('僵尸与掠夺者都由完整立方体四肢构成，并有侧面和走路姿态',()=>{
 for(const skin of ['zombie','pillager']){
  const idle=mobGeometry(skin,0,1),walk=mobGeometry(skin,1.2,1);
  for(const name of ['head','body','leftArm','rightArm','leftLeg','rightLeg'])assert.ok(idle.some(f=>f.part===name),`${skin} ${name}`);
  assert.ok(idle.some(f=>f.face==='side'));assert.notDeepEqual(idle,walk);
  assert.notDeepEqual(walk,mobGeometry(skin,1.2,-1));
 }
});
test('人物在实际楼板上巡逻并转向，边缘前停步而非悬空走路',()=>{
 const grid=new PixelGrid(240,160);grid.fill(0,144,240,16,7);grid.fill(60,112,80,16,10);grid.fill(60,112,16,32,4);
 const w=new SiegeWorld(M,{grid,pixelSize:2}),e=w.addEnemy(200,224),start=e.body.position.x;
 for(let i=0;i<480;i++)w.step(1/120);
 assert.ok(e.alive);assert.ok(e.walkDistance>30);assert.ok(e.turns>0);assert.ok(e.body.position.x>138&&e.body.position.x<263);
 assert.ok(Math.abs(e.body.position.x-start)>1);assert.ok(Math.abs(e.body.bounds.max.y-224)<2);
 grid.fill(60,112,80,16,0);w.synchronize();for(let i=0;i<36;i++)w.step(1/120);
 assert.ok(e.body.bounds.max.y>230);
});
test('两个人物迎面可以交错走过，不相撞弹开',()=>{
 const grid=new PixelGrid(240,160);grid.fill(0,128,240,32,7);const w=new SiegeWorld(M,{grid,pixelSize:2}),a=w.addEnemy(180,256),b=w.addEnemy(265,256,'pillager');
 for(let i=0;i<480;i++)w.step(1/120);
 assert.equal(a.turns,0);assert.equal(b.turns,0);assert.ok(a.body.position.x>b.body.position.x);
});
test('人物会暂停观望与抬手，动作连续而非一直机械行走',()=>{
 const grid=new PixelGrid(500,160);grid.fill(0,128,500,32,7);const w=new SiegeWorld(M,{grid,pixelSize:2}),e=w.addEnemy(400,256);
 const seen=new Set();let look=false,wave=false;for(let i=0;i<14*120;i++){w.step(1/120);seen.add(e.behavior);look||=Math.abs(e.pose?.headYaw||0)>.08;wave||=(e.pose?.gesture||0)>.3;}
 assert.ok(seen.has('walk')&&seen.has('idle'));assert.ok(look);assert.ok(wave);
});
test('人物相邻显示帧连续插值，不量化成每周期24张图片',async()=>{
 const {MobSprites}=await import('../src/mobs.mjs'),calls=[];
 const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},transform(...v){calls.push(v);},drawImage(){},fillRect(){}};
 const sprites=new MobSprites({images:{zombie:{}}}),e={alive:true,body:{position:{x:0,y:0},angle:0},skin:'zombie',walkDistance:8,facing:1};
 sprites.paint(ctx,e.skin,e.walkDistance/14,e.facing);const first=JSON.stringify(calls);calls.length=0;e.walkDistance+=.05;sprites.paint(ctx,e.skin,e.walkDistance/14,e.facing);
 assert.notEqual(JSON.stringify(calls),first);
});
