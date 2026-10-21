import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {nativeGeometry,geometryBounds} from '../src/native-geometry.mjs';
import {NATIVE_MODELS} from '../src/native-model-data.mjs';

test('native mob geometry retains each original model and texture file',()=>{
 const records=JSON.parse(fs.readFileSync(new URL('../docs/native-entity-assets.json',import.meta.url)));
 for(const r of records){
  const bytes=fs.readFileSync(new URL('../'+r.file,import.meta.url));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),r.sha256,r.file);
  if(r.file.endsWith('.geo.json'))assert.deepEqual(NATIVE_MODELS[r.file.split('/').at(-1).replace('.geo.json','')],JSON.parse(bytes));
 }
 for(const skin of ['wither','wither_skeleton','ender_dragon','sift_blub','sift_sifter','sift_singer','sift_echo_golem']){
  const faces=nativeGeometry(skin,.7,1),b=geometryBounds(faces);
  assert.ok(faces.length>15,skin);assert.ok(b.right>b.left&&b.bottom>b.top,skin);
  for(const f of faces)assert.ok(f.vertices.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)),skin);
 }
 assert.ok(fs.readFileSync(new URL('../assets/licenses/Mielon-The-Sift-MIT.txt',import.meta.url),'utf8').includes('Copyright (c) 2026 Mielon'));
});

test('dragon wing tips and feet remain connected across both facing directions and wing beats',()=>{
 for(const direction of [-1,1])for(const phase of [0,.8,2.4,4.5]){
  const faces=nativeGeometry('ender_dragon',phase,direction),vertices=part=>faces.filter(f=>f.part===part).flatMap(f=>f.vertices);
  for(const [child,parent,tolerance] of [['wingtip','wing',.01],['wingtip1','wing1',.01],['rearfoot','rearlegtip'],['rearfoot1','rearlegtip1'],['frontfoot','frontlegtip'],['frontfoot1','frontlegtip1']]){
   const a=vertices(child),b=vertices(parent);assert.ok(a.length&&b.length,child);
   const gap=Math.min(...a.flatMap(p=>b.map(q=>Math.hypot(p.x-q.x,p.y-q.y))));
   if(tolerance)assert.ok(gap<=tolerance,`${child} detached from ${parent}: ${gap}`);
   else{
    // A foot's broad contact face meets the shin in its interior; corner
    // proximity cannot measure that joint, so require visible surface overlap.
    const box=points=>({left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))}),aa=box(a),bb=box(b);
    assert.ok(aa.left<=bb.right&&aa.right>=bb.left&&aa.top<=bb.bottom&&aa.bottom>=bb.top,`${child} surface detached from ${parent}`);
   }
  }
 }
});

test('dragon flight silhouette keeps level feet below the belly and front/rear pairs apart',()=>{
 for(const direction of [-1,1])for(const wingFlap of [0,.125,.25,.375,.5,.625,.75,.875]){
  const faces=nativeGeometry('ender_dragon',wingFlap*Math.PI*2,direction,{wingFlap}),bounds=part=>geometryBounds(faces.filter(f=>f.part===part)),body=bounds('body');
  for(const suffix of ['', '1']){
   const front=bounds('frontfoot'+suffix),rear=bounds('rearfoot'+suffix);
   for(const foot of [front,rear]){
    assert.ok(foot.top>body.bottom+12,'feet must remain below belly, not curled into it');
    assert.ok(foot.bottom-foot.top<(foot.right-foot.left)*.55,'feet should be level broad platforms');
   }
   assert.ok(Math.abs((front.left+front.right-rear.left-rear.right)/2)>30,'front and rear feet need separate silhouettes');
  }
 }
});

test('Wither Skeleton uses native narrow bone limbs and carries its original stone sword',()=>{
 const faces=nativeGeometry('wither_skeleton',.7,1),bones=NATIVE_MODELS.wither_skeleton['geometry.skeleton.wither.v1.8'].bones;
 for(const part of ['rightArm','leftArm','rightLeg','leftLeg']){
  const cube=bones.find(b=>b.name===part).cubes[0];assert.equal(cube.size[0],2);assert.equal(cube.size[2],2);
 }
 assert.ok(faces.some(f=>f.part==='stoneSword'&&f.texture==='stone_sword'));
 assert.ok(!faces.some(f=>f.part==='hat'));
});

test('end crystal has independent transparent glass, core and grounded pedestal geometry',()=>{
 const a=nativeGeometry('end_crystal_entity',0),b=nativeGeometry('end_crystal_entity',1);
 for(const part of ['outerglass','innerglass','crystal','base'])assert.ok(a.some(f=>f.part===part));
 assert.deepEqual(a.filter(f=>f.part==='base'),b.filter(f=>f.part==='base'));
 assert.notDeepEqual(a.filter(f=>f.part==='crystal'),b.filter(f=>f.part==='crystal'));
 assert.equal(geometryBounds(a.filter(f=>f.part==='base')).bottom,17.92);
});
