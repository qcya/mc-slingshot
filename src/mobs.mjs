// Orthographic cuboids with the original Java skin box UV layout. Physics stays 2D.
// Every face is a different region of the skin, never a flat skin atlas billboard.
import {mobAppearance} from './animation.mjs';
export function mobGeometry(skin,phase,direction,pose={}){
 const ill=skin==='pillager',headH=ill?10:8,faces=[],yaw=-direction*1.08,cy=Math.cos(yaw),sy=Math.sin(yaw);
 const swing=Math.sin(phase)*.64*(pose.walkBlend??1);
 function box(part,x,y,z,w,h,d,u,v,rotation=0,pivotY=y){
  const transform=([px,py,pz])=>{
   const dy=py-pivotY,zz=pz,cr=Math.cos(rotation),sr=Math.sin(rotation);
   py=pivotY+dy*cr-zz*sr;pz=dy*sr+zz*cr;
   if(part==='head'||part==='nose'){
    const yaw=pose.headYaw||0,pitch=pose.headPitch||0,c=Math.cos(yaw),s=Math.sin(yaw),xx=px*c+pz*s,zz=-px*s+pz*c,yy=py+24;
    px=xx;py=-24+yy*Math.cos(pitch)-zz*Math.sin(pitch);pz=yy*Math.sin(pitch)+zz*Math.cos(pitch);
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
 box('leftLeg',0,-12,-2,4,12,4,0,ill?22:16,-swing,-12);
 box('rightLeg',-4,-12,-2,4,12,4,0,ill?22:16,swing,-12);
 box('body',-4,-24,-3,8,12,6,16,ill?20:16);
 // Pillager independent-arm UV is at (40,46), not the crossed-arm texture.
 box('leftArm',4,-24,-2,4,12,4,40,ill?46:16,swing*.75,-24);
 box('rightArm',-8,-24,-2,4,12,4,40,ill?46:16,-swing*.75-(pose.gesture||0)*1.5,-24);
 box('head',-4,-24-headH,-4,8,headH,8,0,0);
 if(ill)box('nose',-1,-29,-6,2,4,2,24,0);
 return faces.sort((a,b)=>b.depth-a.depth);
}
export class MobSprites{
 constructor(assets){this.assets=assets;this.cache=new Map();this.scratch=new WeakMap();}
 paint(c,skin,phase,direction,pose={}){
  for(const f of mobGeometry(skin,phase,direction,pose)){
   const [u,v,w,h]=f.uv,[a,b,,d]=f.vertices;c.save();
   c.transform((b.x-a.x)/w,(b.y-a.y)/w,(d.x-a.x)/h,(d.y-a.y)/h,a.x,a.y);
   c.drawImage(this.assets.images[skin],u,v,w,h,0,0,w,h);
   if(f.face==='side'){c.fillStyle='#0002';c.fillRect(0,0,w,h);}c.restore();
  }
 }
 frame(skin,phase,direction){
  const key=`${skin}:${phase.toFixed(4)}:${direction}`;
  if(this.cache.has(key))return this.cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=108;canvas.height=120;
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.translate(54,110);c.scale(2.7,2.7);
  this.paint(c,skin,phase,direction);
  if(this.cache.size>=64)this.cache.delete(this.cache.keys().next().value);
  this.cache.set(key,canvas);return canvas;
 }
 draw(c,e,world){
  const b=e.body,phase=e.alive?e.walkDistance/14:0,appearance=mobAppearance(e,world.time);if(!appearance.visible)return;
  let frame=this.scratch.get(e);
  if(!frame){frame=document.createElement('canvas');frame.width=108;frame.height=120;this.scratch.set(e,frame);}
  const paint=frame.getContext('2d');paint.setTransform(1,0,0,1,0,0);paint.clearRect(0,0,108,120);paint.imageSmoothingEnabled=false;
  paint.translate(54,110);paint.scale(2.7,2.7);this.paint(paint,e.skin,phase,e.facing||1,e.pose);
  if(appearance.hurt){paint.setTransform(1,0,0,1,0,0);paint.globalCompositeOperation='source-atop';paint.fillStyle='#ff303080';paint.fillRect(0,0,108,120);paint.globalCompositeOperation='source-over';}
  c.save();c.translate(b.position.x,b.position.y+46-Math.sin(Math.abs(appearance.angle))*14);c.rotate(b.angle+appearance.angle);
  c.drawImage(frame,-54,-110);c.restore();
 }
}
