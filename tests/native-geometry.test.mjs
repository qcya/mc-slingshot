import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {nativeGeometry,geometryBounds} from '../src/native-geometry.mjs';
import {NATIVE_MODELS} from '../src/native-model-data.mjs';
import {Renderer} from '../src/renderer.mjs';

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

test('sword brown grip texel stays inside the animated right hand in both facings',()=>{
 for(const direction of [-1,1])for(const phase of [0,.7,1.4,2.1,3.2])for(const walkBlend of [0,1]){
  const faces=nativeGeometry('wither_skeleton',phase,direction,{walkBlend,headYaw:.3}),sword=faces.find(f=>f.part==='stoneSword'),arm=faces.find(f=>f.part==='rightArm'&&f.face==='front'),[a,b,,d]=sword.vertices;
  // Interpolate the real brown handle texel from the returned textured plane.
  const u=3.5/16,v=12.5/16,grip={x:a.x+(b.x-a.x)*u+(d.x-a.x)*v,y:a.y+(b.y-a.y)*u+(d.y-a.y)*v};
  assert.ok(Math.hypot(grip.x-sword.hand.x,grip.y-sword.hand.y)<1e-9,'the handle must coincide with the transformed hand centre');
  // The hand must also be the lower endpoint of the returned original arm
  // geometry, independently of the attachment metadata (2px-wide native bone).
  const edge={x:(arm.vertices[2].x+arm.vertices[3].x)/2,y:(arm.vertices[2].y+arm.vertices[3].y)/2};
  assert.ok(Math.hypot(grip.x-edge.x,grip.y-edge.y)<1.1,'handle must be enclosed by the right-arm endpoint');
  const tip={x:a.x+(b.x-a.x)*13.5/16+(d.x-a.x)*2.5/16,y:a.y+(b.y-a.y)*13.5/16+(d.y-a.y)*2.5/16};
  assert.ok(tip.y<grip.y-8,'blade points up from grip');
  assert.ok((tip.x-grip.x)*direction>3,'blade leans forward clear of the torso');
 }
});

test('end crystal has independent transparent glass, core and grounded pedestal geometry',()=>{
 const a=nativeGeometry('end_crystal_entity',0),b=nativeGeometry('end_crystal_entity',1);
 for(const part of ['outerglass','innerglass','crystal','base'])assert.ok(a.some(f=>f.part===part));
 assert.deepEqual(a.filter(f=>f.part==='base'),b.filter(f=>f.part==='base'));
 assert.notDeepEqual(a.filter(f=>f.part==='crystal'),b.filter(f=>f.part==='crystal'));
 assert.equal(geometryBounds(a.filter(f=>f.part==='base')).bottom,17.92);
});

test('Dragon crystal beam vanishes with its owner crystal and HUD reports actual healers',()=>{
 const moves=[],labels=[],ctx={save(){},restore(){},translate(...a){moves.push(a);},rotate(){},scale(){},fillRect(){},fillText(t){labels.push(t);}};
 const dragon={id:2,skin:'ender_dragon',alive:true,hp:300,body:{position:{x:800,y:300},angle:0},walkDistance:0,facing:1,feetOffset:55,pose:{},encounterPhase:'perch'},crystal={healingOwner:2,body:{position:{x:700,y:500}},ammo:{id:'crystal',size:28}},world={time:1,enemies:[dragon],projectiles:[crystal]},renderer={ctx};
 Renderer.prototype.healingBeams.call(renderer,world,1);assert.equal(moves.length,1);assert.equal(moves[0][0],700);assert.ok(moves[0][1]<500,'beam starts at floating core');
 Renderer.prototype.bossHud.call(renderer,world);assert.ok(labels.some(s=>s.includes('1 座水晶')));
 crystal.dead=true;moves.length=0;labels.length=0;Renderer.prototype.healingBeams.call(renderer,world,1);assert.equal(moves.length,0);
 Renderer.prototype.bossHud.call(renderer,world);assert.ok(labels.some(s=>s.includes('水晶已摧毁')&&s.includes('停栖')));
});

test('Echo shield is a front plane, reflection makes shards, and HUD changes to exposed core',()=>{
 const rectangles=[],labels=[],ctx={save(){},restore(){},fillRect(...a){rectangles.push(a);},translate(){},scale(){},fillText(t){labels.push(t);}},e={skin:'sift_echo_golem',alive:true,hp:200,facing:-1,body:{position:{x:1000,y:400}},dimensions:{width:96},echoShieldActive:true,echoRecoveryUntil:0,pose:{}},world={time:1,enemies:[e]},renderer={ctx};
 Renderer.prototype.echoGuard.call(renderer,e,world);assert.ok(rectangles.length>0);assert.ok(rectangles.every(r=>r[0]+r[2]<1000),'all shield pixels must be in front, to the left');
 Renderer.prototype.bossHud.call(renderer,world);assert.ok(labels.some(s=>s.includes('反弹一次')));
 labels.length=0;e.echoShieldActive=false;e.echoRecoveryUntil=3;Renderer.prototype.bossHud.call(renderer,world);assert.ok(labels.some(s=>s.includes('核心暴露')));
 const effects={particles:[],effects:[],assets:{play(){}}};Renderer.prototype.consume.call(effects,{events:[{type:'echoReflect',x:940,y:400}]});assert.equal(effects.particles.length,18);assert.equal(effects.effects.length,0,'no generic pulse ring');
});
