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
 for(const skin of ['wither','ender_dragon','sift_blub','sift_sifter','sift_singer','sift_echo_golem']){
  const faces=nativeGeometry(skin,.7,1),b=geometryBounds(faces);
  assert.ok(faces.length>15,skin);assert.ok(b.right>b.left&&b.bottom>b.top,skin);
  for(const f of faces)assert.ok(f.vertices.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)),skin);
 }
 assert.ok(fs.readFileSync(new URL('../assets/licenses/Mielon-The-Sift-MIT.txt',import.meta.url),'utf8').includes('Copyright (c) 2026 Mielon'));
});

test('dragon wing tips and feet remain connected across both facing directions and wing beats',()=>{
 for(const direction of [-1,1])for(const phase of [0,.8,2.4,4.5]){
  const faces=nativeGeometry('ender_dragon',phase,direction),vertices=part=>faces.filter(f=>f.part===part).flatMap(f=>f.vertices);
  for(const [child,parent,tolerance] of [['wingtip','wing',.01],['wingtip1','wing1',.01],['rearfoot','rearlegtip',2],['rearfoot1','rearlegtip1',2],['frontfoot','frontlegtip',2],['frontfoot1','frontlegtip1',2]]){
   const a=vertices(child),b=vertices(parent);assert.ok(a.length&&b.length,child);
   const gap=Math.min(...a.flatMap(p=>b.map(q=>Math.hypot(p.x-q.x,p.y-q.y))));
   assert.ok(gap<=tolerance,`${child} detached from ${parent}: ${gap}`);
  }
 }
});

test('end crystal has independent transparent glass, core and grounded pedestal geometry',()=>{
 const a=nativeGeometry('end_crystal_entity',0),b=nativeGeometry('end_crystal_entity',1);
 for(const part of ['outerglass','innerglass','crystal','base'])assert.ok(a.some(f=>f.part===part));
 assert.deepEqual(a.filter(f=>f.part==='base'),b.filter(f=>f.part==='base'));
 assert.notDeepEqual(a.filter(f=>f.part==='crystal'),b.filter(f=>f.part==='crystal'));
 assert.equal(geometryBounds(a.filter(f=>f.part==='base')).bottom,17.92);
});
