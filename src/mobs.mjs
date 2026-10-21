// Orthographic cuboids with the original Java skin box UV layout. Physics stays 2D.
// Every face is a different region of the skin, never a flat skin atlas billboard.
import {mobAppearance} from './animation.mjs';
import {nativeGeometry,geometryBounds,NATIVE_PROFILES} from './native-geometry.mjs';
export function mobGeometry(skin,phase,direction,pose={}){
 const native=nativeGeometry(skin,phase,direction,pose);if(native)return native;
 const ill=skin==='pillager',warden=skin==='warden',piglin=skin==='zombified_piglin',headH=ill?10:8,faces=[],yaw=-direction*1.08,cy=Math.cos(yaw),sy=Math.sin(yaw);
 const swing=Math.sin(phase)*(warden?.34:.64)*(pose.walkBlend??1);
 function box(part,x,y,z,w,h,d,u,v,rotation=0,pivotY=y,pivotZ=0){
  const transform=([px,py,pz])=>{
   const dy=py-pivotY,zz=pz-pivotZ,cr=Math.cos(rotation),sr=Math.sin(rotation);
   py=pivotY+dy*cr-zz*sr;pz=pivotZ+dy*sr+zz*cr;
   if(skin!=='hoglin'&&skin!=='shulker'&&(part==='head'||part==='nose'||part==='snout'||part.endsWith('Ear')||part.endsWith('Tusk')||part.endsWith('Tendril'))){
    const pivot=warden?34:skin==='enderman'?44:24,yaw=pose.headYaw||0,pitch=pose.headPitch||0,c=Math.cos(yaw),s=Math.sin(yaw),xx=px*c+pz*s,zz=-px*s+pz*c,yy=py+pivot;
    px=xx;py=-pivot+yy*Math.cos(pitch)-zz*Math.sin(pitch);pz=yy*Math.sin(pitch)+zz*Math.cos(pitch);
   }
   const xx=px*cy+pz*sy,depth=-px*sy+pz*cy;
   return {x:xx,y:py-depth*.16,depth};
  };
  const p=(a,b,c)=>transform([a,b,c]);
  const add=(face,vertices,uv)=>{const a=vertices[0],b=vertices[1],c=vertices[3];
   const cross=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(cross<=0)return;
   faces.push({part,face,vertices,uv,depth:vertices.reduce((s,p)=>s+p.depth+p.y*.16,0)/4});};
  add('front',[p(x,y,z),p(x+w,y,z),p(x+w,y+h,z),p(x,y+h,z)],[u+d,v+d,w,h]);
  add('back',[p(x+w,y,z+d),p(x,y,z+d),p(x,y+h,z+d),p(x+w,y+h,z+d)],[u+2*d+w,v+d,w,h]);
  add('side',[p(x+w,y,z),p(x+w,y,z+d),p(x+w,y+h,z+d),p(x+w,y+h,z)],[u+d+w,v+d,d,h]);
  add('side',[p(x,y,z+d),p(x,y,z),p(x,y+h,z),p(x,y+h,z+d)],[u,v+d,d,h]);
  add('top',[p(x,y,z+d),p(x+w,y,z+d),p(x+w,y,z),p(x,y,z)],[u+d,v,w,d]);
  add('bottom',[p(x,y+h,z),p(x+w,y+h,z),p(x+w,y+h,z+d),p(x,y+h,z+d)],[u+d+w,v,w,d]);
 }
 if(skin==='shulker'){
  const open=pose.openAmount??0;
  box('shellBase',-8,-8,-8,16,8,16,0,28);
  box('head',-3,-13,-3,6,6,6,0,52);
  box('shellLid',-8,-16-open*9,-8,16,12,16,0,0);
  return faces.sort((a,b)=>b.depth-a.depth);
 }
 if(skin==='hoglin'){
  box('body',-8,-25,-7,16,14,26,1,1);
  box('mane',0,-32,-10,0,10,19,90,33);
  box('frontLeftLeg',2,-14,-6,6,14,6,41,42,-swing*.55,-12,-3);
  box('frontRightLeg',-8,-14,-6,6,14,6,66,42,swing*.55,-12,-3);
  box('backLeftLeg',3,-11,13,5,11,5,0,45,swing*.55,-8,17);
  box('backRightLeg',-8,-11,13,5,11,5,21,45,-swing*.55,-8,17);
  const tilt=.87+Math.sin(phase*.5)*.035;
  box('head',-7,-27,-24,14,6,19,61,1,tilt,-22,-5);
  box('leftTusk',6,-33,-19,2,11,2,1,13,tilt,-22,-5);
  box('rightTusk',-8,-33,-19,2,11,2,1,13,tilt,-22,-5);
  box('leftEar',7,-27,-10,6,1,4,1,6,tilt,-22,-5);
  box('rightEar',-13,-27,-10,6,1,4,1,1,tilt,-22,-5);
  return faces.sort((a,b)=>b.depth-a.depth);
 }
 if(skin==='enderman'){
  box('leftLeg',1,-30,-1,2,30,2,56,0,-swing*.6,-30);
  box('rightLeg',-3,-30,-1,2,30,2,56,0,swing*.6,-30);
  box('body',-4,-42,-2,8,12,4,32,16);
  box('leftArm',4,-42,-1,2,30,2,56,0,swing*.5,-42);
  box('rightArm',-6,-42,-1,2,30,2,56,0,-swing*.5,-42);
  box('head',-4,-50,-4,8,8,8,0,0);
  return faces.sort((a,b)=>b.depth-a.depth);
 }
 if(piglin){
  box('leftLeg',0,-12,-2,4,12,4,16,48,-swing,-12);
  box('rightLeg',-4,-12,-2,4,12,4,0,16,swing,-12);
  box('body',-4,-24,-2,8,12,4,16,16);
  box('leftArm',4,-24,-2,4,12,4,32,48,swing*.75,-24);
  box('rightArm',-8,-24,-2,4,12,4,40,16,-swing*.75,-24);
  box('head',-5,-32,-4,10,8,8,0,0);
  box('snout',-2,-28,-5,4,4,1,31,1);
  box('leftTusk',2,-26,-5,1,2,1,2,4);
  box('rightTusk',-3,-26,-5,1,2,1,2,0);
  box('leftEar',4,-30,-2,1,5,4,51,6);
  box('rightEar',-5,-30,-2,1,5,4,39,6);
  return faces.sort((a,b)=>b.depth-a.depth);
 }
 if(warden){
  // Mojang's Warden geometry: 128 atlas, 18x21 chest, 16x16 head,
  // 8x28 arms, 6x13 legs, and two independent 16x16 ear tendrils.
  // https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/models/entity/warden.geo.json
  box('leftLeg',3,-13,-3,6,13,6,76,76,-swing,-13);
  box('rightLeg',-9,-13,-3,6,13,6,76,48,swing,-13);
  box('body',-9,-34,-7,18,21,11,0,0);
  box('leftArm',9,-34,-5,8,28,8,0,58,swing*.7,-34);
  box('rightArm',-17,-34,-5,8,28,8,44,50,-swing*.7-(pose.gesture||0)*.45,-34);
  box('head',-8,-50,-5,16,16,10,0,32);
  const twitch=Math.sin(phase*1.3+.6)*.065;
  box('leftTendril',8,-59,0,16,16,0,58,0,twitch,-46);
  box('rightTendril',-24,-59,0,16,16,0,52,32,-twitch,-46);
  return faces.sort((a,b)=>b.depth-a.depth);
 }
 box('leftLeg',0,-12,-2,4,12,4,0,ill?22:16,-swing,-12);
 box('rightLeg',-4,-12,-2,4,12,4,0,ill?22:16,swing,-12);
 // Zombies use the 4-deep humanoid torso; the illager torso is 6 deep.
 // Reusing the illager depth shifts zombie UVs into the transparent waist rows.
 box('body',-4,-24,ill?-3:-2,8,12,ill?6:4,16,ill?20:16);
 // Pillager independent-arm UV is at (40,46), not the crossed-arm texture.
 box('leftArm',4,-24,-2,4,12,4,40,ill?46:16,swing*.75,-24);
 box('rightArm',-8,-24,-2,4,12,4,40,ill?46:16,-swing*.75-(pose.gesture||0)*1.5,-24);
 box('head',-4,-24-headH,-4,8,headH,8,0,0);
 if(ill)box('nose',-1,-29,-6,2,4,2,24,0);
 return faces.sort((a,b)=>b.depth-a.depth);
}
const frameSize=skin=>skin==='ender_dragon'?[380,210]:skin==='wither'?[180,140]:NATIVE_PROFILES[skin]?[210,210]:skin==='warden'?[200,180]:skin==='hoglin'?[180,150]:skin==='enderman'?[108,180]:skin==='shulker'?[120,120]:[108,120];
const nativeAnchors=new Map();
function anchor(skin){
 if(!nativeAnchors.has(skin)){const b=geometryBounds(nativeGeometry(skin,0,1,{walkBlend:0}));nativeAnchors.set(skin,{x:(b.left+b.right)/2,y:b.bottom});}
 return nativeAnchors.get(skin);
}
// Attach encounter effects to the rendered model rather than its physics box.
export function mobPartFaces(e,part){
 if(!NATIVE_PROFILES[e.skin])return [];
 const direction=e.facing||1,a=anchor(e.skin),s=NATIVE_PROFILES[e.skin].scale,angle=e.body.angle||0,cy=Math.cos(angle),sy=Math.sin(angle);
 return mobGeometry(e.skin,e.walkDistance/14,direction,e.pose).filter(f=>f.part===part).map(f=>({...f,vertices:f.vertices.map(v=>{const x=(v.x-a.x*direction)*s,y=(v.y-a.y)*s;return {x:e.body.position.x+x*cy-y*sy,y:e.body.position.y+(e.feetOffset??46)+x*sy+y*cy};})}));
}
export function mobPartCenter(e,part){
 const faces=mobPartFaces(e,part);if(!faces.length)return {...e.body.position};
 const b=geometryBounds(faces);return {x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};
}
export class MobSprites{
 constructor(assets){this.assets=assets;this.cache=new Map();this.scratch=new WeakMap();this.opaqueSkins=new WeakMap();}
 skinImage(skin){
  const source=this.assets.images[skin];if(skin!=='enderman')return source;
  if(this.opaqueSkins.has(source))return this.opaqueSkins.get(source);
  // Bedrock's Enderman TGA stores emissive information in alpha. Its model
  // uses opaque faces; interpreting those bytes as Canvas opacity hides eyes
  // and the lower jaw. Preserve every original RGB texel and make faces opaque.
  const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
  const c=canvas.getContext('2d');c.drawImage(source,0,0);
  const pixels=c.getImageData(0,0,canvas.width,canvas.height);
  for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=255;
  c.putImageData(pixels,0,0);this.opaqueSkins.set(source,canvas);return canvas;
 }
 paint(c,skin,phase,direction,pose={}){
  const image=this.skinImage(skin);
  for(const f of mobGeometry(skin,phase,direction,pose)){
   const [u,v,w,h]=f.uv,[a,b,,d]=f.vertices;c.save();
   c.transform((b.x-a.x)/Math.abs(w),(b.y-a.y)/Math.abs(w),(d.x-a.x)/Math.abs(h),(d.y-a.y)/Math.abs(h),a.x,a.y);
   if(w<0||h<0){c.translate(w<0?-w:0,h<0?-h:0);c.scale(w<0?-1:1,h<0?-1:1);}
   c.drawImage(f.texture?this.assets.images[f.texture]:image,Math.min(u,u+w),Math.min(v,v+h),Math.abs(w),Math.abs(h),0,0,Math.abs(w),Math.abs(h));
   if(f.face==='side'){c.fillStyle='#0002';c.fillRect(0,0,Math.abs(w),Math.abs(h));}c.restore();
  }
 }
 frame(skin,phase,direction){
  const key=`${skin}:${phase.toFixed(4)}:${direction}`;
  if(this.cache.has(key))return this.cache.get(key);
  const canvas=document.createElement('canvas');[canvas.width,canvas.height]=frameSize(skin);
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.translate(canvas.width/2,canvas.height-10);const s=NATIVE_PROFILES[skin]?.scale??2.7;c.scale(s,s);if(NATIVE_PROFILES[skin]){const a=anchor(skin);c.translate(-a.x*direction,-a.y);}
  this.paint(c,skin,phase,direction);
  if(this.cache.size>=64)this.cache.delete(this.cache.keys().next().value);
  this.cache.set(key,canvas);return canvas;
 }
 draw(c,e,world){
  const b=e.body,phase=e.alive?e.walkDistance/14:0,appearance=mobAppearance(e,world.time);if(!appearance.visible)return;
  let frame=this.scratch.get(e);
  if(!frame){frame=document.createElement('canvas');[frame.width,frame.height]=frameSize(e.skin);this.scratch.set(e,frame);}
  const paint=frame.getContext('2d');paint.setTransform(1,0,0,1,0,0);paint.clearRect(0,0,frame.width,frame.height);paint.imageSmoothingEnabled=false;
  paint.translate(frame.width/2,frame.height-10);const s=NATIVE_PROFILES[e.skin]?.scale??2.7;paint.scale(s,s);if(NATIVE_PROFILES[e.skin]){const a=anchor(e.skin);paint.translate(-a.x*(e.facing||1),-a.y);}this.paint(paint,e.skin,phase,e.facing||1,e.pose);
  if(appearance.hurt){paint.setTransform(1,0,0,1,0,0);paint.globalCompositeOperation='source-atop';paint.fillStyle='#ff303080';paint.fillRect(0,0,frame.width,frame.height);paint.globalCompositeOperation='source-over';}
  c.save();c.translate(b.position.x,b.position.y+(e.feetOffset??46)-Math.sin(Math.abs(appearance.angle))*14);c.rotate(b.angle+appearance.angle);
  c.drawImage(frame,-frame.width/2,-frame.height+10);c.restore();
 }
}
