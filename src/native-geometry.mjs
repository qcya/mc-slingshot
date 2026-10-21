// Bedrock / GeckoLib cuboids retain the upstream bones, pivots and atlas UVs.
import {NATIVE_MODELS} from './native-model-data.mjs';
export const NATIVE_PROFILES={wither:{scale:3.6},wither_skeleton:{scale:3.6},ender_dragon:{scale:1.12},sift_blub:{scale:2.7},sift_sifter:{scale:2.7},sift_singer:{scale:2.7},sift_echo_golem:{scale:2.7}};
const RAD=Math.PI/180;
function rotate(point,pivot=[0,0,0],angles=[0,0,0],scale=1){
 let [x,y,z]=point.map((v,i)=>(v-pivot[i])*scale);
 for(let i=0;i<3;i++){
  const a=(angles[i]||0)*RAD,c=Math.cos(a),s=Math.sin(a);
  if(i===0)[y,z]=[y*c-z*s,y*s+z*c];
  if(i===1)[x,z]=[x*c+z*s,-x*s+z*c];
  if(i===2)[x,y]=[x*c-y*s,x*s+y*c];
 }
 return [x+pivot[0],y+pivot[1],z+pivot[2]];
}
const geometry=skin=>{const g=NATIVE_MODELS[skin];return g?.['minecraft:geometry']?.[0]??Object.values(g||{}).find(v=>v?.bones);};
function dragonBones(original,phase,pose){
 // Bedrock's dragon renderer instantiates the neck/tail templates at runtime.
 // Reconstruct those chains while keeping every original cuboid and UV.
 const bones=original.filter(b=>b.name!=='neck').map(b=>({...b}));
 const head=bones.find(b=>b.name==='head');head.offset=[0,1,-48];head.pivot=[0,25,-48];
 for(let i=0;i<5;i++)bones.push({...original.find(b=>b.name==='neck'),name:`neck${i}`,offset:[Math.sin(phase+i*.35)*1.2,1,-8-i*8]});
 for(let i=0;i<12;i++)bones.push({...original.find(b=>b.name==='neck'),name:`tail${i}`,offset:[Math.sin(phase*.6-i*.35)*(i*.9),-1-i*.4,55+i*8]});
 for(const b of bones){
  const opposite=b.name.endsWith('1'),side=opposite?1:-1;
  if(opposite&&b.name.startsWith('wing'))b.cubes=original.find(part=>part.name===b.name.slice(0,-1)).cubes?.map(c=>({...c,origin:[-c.origin[0]-c.size[0],c.origin[1],c.origin[2]],mirror:!c.mirror}));
  if(b.name==='wing'||b.name==='wing1')b.animRotation=[7-Math.cos(phase)*11,0,side*(Math.sin(phase)*25+12)];
  if(b.name.startsWith('wingtip')){
   b.parent=opposite?'wing1':'wing';b.pivot=[side*68,19,2];
   b.offset=[side*12,-5,2];b.animRotation=[0,0,side*(Math.sin(phase+.7)*18+12)];
  }
  // Flight silhouette: hips trail backwards, knees bend forwards, and broad
  // feet stay level. Previous cumulative positive rotations curled all three
  // joints into the belly. Small counter-rotation keeps toes recognizable.
  const flex=Math.sin(phase)*3;
  if(b.name.startsWith('rearleg')&&!b.name.includes('tip'))b.animRotation=[-55+flex,0,side*4];
  if(b.name.startsWith('frontleg')&&!b.name.includes('tip'))b.animRotation=[-32+flex,0,side*5];
  if(b.name.includes('legtip')){const rear=b.name.startsWith('rear'),suffix=opposite?'1':'';b.offset=[side*(rear?16:12),rear?-12:-20,rear?46:3];b.pivot=[side*(rear?16:12),rear?-20:-16,rear?42:2];b.parent=(rear?'rearleg':'frontleg')+suffix;b.animRotation=[rear?88:68,0,0];}
  if(b.name.includes('foot')){const rear=b.name.startsWith('rear'),suffix=opposite?'1':'';b.offset=[side*(rear?16:12),rear?-43:-38,rear?46:2];b.pivot=[side*(rear?16:12),rear?-50:-37,rear?50:2];b.parent=(rear?'rearlegtip':'frontlegtip')+suffix;b.animRotation=[(rear?-33:-36)-flex,0,0];}
  if(b.name==='jaw'){b.offset=[0,1,-48];b.pivot=[0,21,-56];b.animRotation=[(pose.jawOpen??.15)*32,0,0];}
 }
 return bones;
}
export function nativeGeometry(skin,phase=0,direction=1,pose={}){
 const model=geometry(skin);if(!model)return null;
 const bones=skin==='ender_dragon'?dragonBones(model.bones,pose.wingFlap===undefined?phase:pose.wingFlap*Math.PI*2,pose):model.bones;
 const byName=new Map(bones.map(b=>[b.name,b])),faces=[];
 const crystal=skin==='end_crystal_entity',yaw=crystal?0:skin==='wither'?-.42*direction:-1.08*direction,cy=Math.cos(yaw),sy=Math.sin(yaw);
 function animated(b){
  const r=[...(b.rotation||[0,0,0])],n=b.name,swing=Math.sin(phase)*(pose.walkBlend??1)*22;
  if(b.animRotation)for(let i=0;i<3;i++)r[i]+=b.animRotation[i];
  if(skin.startsWith('sift_')){
   if(n.includes('leg'))r[0]+=swing*(n.includes('left')?1:-1)*(n.includes('back')?-1:1);
   if(n.includes('arm'))r[0]+=swing*.55*(n.includes('left')?-1:1)-(pose.gesture||0)*35;
   if(n==='head'){r[1]+=(pose.headYaw||0)*25;r[0]+=(pose.headPitch||0)*25;}
  }
  if(skin==='wither_skeleton'){
   if(n.endsWith('Leg'))r[0]+=swing*(n.startsWith('left')?1:-1);
   if(n.endsWith('Arm'))r[0]+=n.startsWith('right')?-12:swing*.55;
   if(n==='head'){r[1]+=(pose.headYaw||0)*25;r[0]+=(pose.headPitch||0)*25;}
  }
  if(skin==='wither'&&n.toLowerCase().includes('head'))r[1]+=Math.sin(phase*.7)*7;
  if(crystal&&n!=='base'){r[1]+=phase*22;r[2]+=45;r[0]+=35;}
  return r;
 }
 function transform(point,b,cube){
  let p=rotate(point,cube.pivot||b.pivot,cube.rotation);
  // Dragon template placement happens once; parent rotation then carries the
  // already assembled joint. Inheriting placement twice detaches the feet.
  if(b.offset)p=p.map((v,i)=>v+b.offset[i]);
  let current=b,seen=new Set();
  while(current&&!seen.has(current.name)){
   seen.add(current.name);
   p=rotate(p,current.pivot,animated(current),crystal&&current.name==='innerglass'?.875:crystal&&current.name==='crystal'?.6:1);
   current=byName.get(current.parent);
  }
  if(crystal&&b.name!=='base')p[1]+=9+Math.sin(phase*.8)*1.5;
  const x=p[0]*cy+p[2]*sy,depth=-p[0]*sy+p[2]*cy;
  return {x,y:-p[1]-depth*.16,depth};
 }
 for(const b of bones)for(const originalCube of b.neverRender?[]:b.cubes||[]){
  const cube=crystal&&b.name==='base'?{...originalCube,rotation:[0,0,0]}:originalCube;
  if(cube.visibility===false)continue;
  const inflate=cube.inflate||0,[x,y,z]=cube.origin.map(v=>v-inflate),[w,h,d]=cube.size.map(v=>v+inflate*2),u=Array.isArray(cube.uv)?cube.uv[0]:0,v=Array.isArray(cube.uv)?cube.uv[1]:0;
  const p=(a,b1,c)=>transform([a,b1,c],b,cube);
  const add=(name,vertices,uv)=>{
   const [a,b1,,d1]=vertices,cross=(b1.x-a.x)*(d1.y-a.y)-(b1.y-a.y)*(d1.x-a.x);
   if(cross<=.00001)return;
   if(!Array.isArray(cube.uv)){const f=cube.uv?.[name];if(!f)return;uv=[...f.uv,...(f.uv_size||uv.slice(2))];}
   if(!uv[2]||!uv[3])return;
   if(cube.mirror||b.mirror)uv=[uv[0]+uv[2],uv[1],-uv[2],uv[3]];
   faces.push({part:b.name,face:name==='up'?'top':name==='down'?'bottom':name==='north'?'front':name==='south'?'back':'side',vertices,uv,depth:vertices.reduce((sum,p)=>sum+p.depth,0)/4,emissive:skin==='sift_singer'&&b.name==='head'});
  };
  add('north',[p(x,y+h,z),p(x+w,y+h,z),p(x+w,y,z),p(x,y,z)],[u+d,v+d,w,h]);
  add('south',[p(x+w,y+h,z+d),p(x,y+h,z+d),p(x,y,z+d),p(x+w,y,z+d)],[u+2*d+w,v+d,w,h]);
  add('east',[p(x+w,y+h,z),p(x+w,y+h,z+d),p(x+w,y,z+d),p(x+w,y,z)],[u+d+w,v+d,d,h]);
  add('west',[p(x,y+h,z+d),p(x,y+h,z),p(x,y,z),p(x,y,z+d)],[u,v+d,d,h]);
  add('up',[p(x,y+h,z+d),p(x+w,y+h,z+d),p(x+w,y+h,z),p(x,y+h,z)],[u+d,v,w,d]);
  add('down',[p(x,y,z),p(x+w,y,z),p(x+w,y,z+d),p(x,y,z+d)],[u+d+w,v,w,d]);
 }
 if(skin==='wither_skeleton'){
  const b=byName.get('rightArm'),p=(x,y,z)=>transform([x,y,z],b,{}),vertices=[p(-5,26,3),p(-5,26,-13),p(-5,10,-13),p(-5,10,3)];
  if(direction<0)[vertices[0],vertices[1],vertices[2],vertices[3]]=[vertices[1],vertices[0],vertices[3],vertices[2]];
  faces.push({part:'stoneSword',face:'front',texture:'stone_sword',vertices,uv:[0,0,16,16],depth:vertices.reduce((n,v)=>n+v.depth,0)/4});
 }
 return faces.sort((a,b)=>b.depth-a.depth);
}
export function geometryBounds(faces){
 const vertices=faces.flatMap(f=>f.vertices),xs=vertices.map(p=>p.x),ys=vertices.map(p=>p.y);
 return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
}
