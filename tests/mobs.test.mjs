import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {PixelGrid} from '../src/pixels.mjs';import {SiegeWorld} from '../src/world.mjs';import {mobGeometry} from '../src/mobs.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
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
test('两个人物迎面相遇会转身，不永久互相堵住',()=>{
 const grid=new PixelGrid(240,160);grid.fill(0,128,240,32,7);const w=new SiegeWorld(M,{grid,pixelSize:2}),a=w.addEnemy(180,256),b=w.addEnemy(265,256,'pillager');
 for(let i=0;i<480;i++)w.step(1/120);
 assert.ok(a.turns>0&&b.turns>0);assert.ok(Math.abs(a.body.position.x-b.body.position.x)>45);
});
test('人物相邻显示帧连续插值，不量化成每周期24张图片',async()=>{
 const {MobSprites}=await import('../src/mobs.mjs'),calls=[];
 const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},transform(...v){calls.push(v);},drawImage(){},fillRect(){}};
 const sprites=new MobSprites({images:{zombie:{}}}),e={alive:true,body:{position:{x:0,y:0},angle:0},skin:'zombie',walkDistance:8,facing:1};
 sprites.paint(ctx,e.skin,e.walkDistance/14,e.facing);const first=JSON.stringify(calls);calls.length=0;e.walkDistance+=.05;sprites.paint(ctx,e.skin,e.walkDistance/14,e.facing);
 assert.notEqual(JSON.stringify(calls),first);
});
test('黑洞吸引时巡逻不覆盖外力，怪物会被实际拉向核心',()=>{
 const grid=new PixelGrid(240,160);grid.fill(0,128,240,32,7);const w=new SiegeWorld(M,{grid,pixelSize:2}),e=w.addEnemy(250,256);
 w.vortices.push({x:170,y:210,age:0,life:3,tick:0,radius:112,anchor:null});
 for(let i=0;i<96;i++)w.step(1/120);assert.ok(e.body.position.x<240,`x=${e.body.position.x}`);
});
