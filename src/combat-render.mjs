// The vanilla anvil is a block model, so its inventory sprite is assembled
// from the original block textures instead of inventing an item texture.
import {nativeGeometry} from './native-geometry.mjs';
export function makeAnvilIcon(base,top){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 // Fit the complete vanilla stepped anvil to the icon, with legible daylight.
 const point=(x,y,z)=>[34+(x-z*.78)*3.35,59+((x+z)*.36-y)*3.35];
 const face=(image,a,b,d,shade)=>{c.save();c.transform((b[0]-a[0])/16,(b[1]-a[1])/16,(d[0]-a[0])/16,(d[1]-a[1])/16,...a);c.filter='brightness(1.7)';if(image===top)c.drawImage(image,3,0,10,16,0,0,16,16);else c.drawImage(image,0,0,16,16);c.filter='none';if(shade){c.fillStyle=`rgba(0,0,0,${shade})`;c.fillRect(0,0,16,16);}c.restore();};
 const box=(x,y,z,w,h,d)=>{face(base,point(x,y+h,z+d),point(x+w,y+h,z+d),point(x,y,z+d),.06);face(base,point(x+w,y+h,z+d),point(x+w,y+h,z),point(x+w,y,z+d),.22);face(top,point(x,y+h,z),point(x+w,y+h,z),point(x,y+h,z+d),0);};
 box(0,0,0,16,4,10);box(4,4,1,8,6,8);box(2,10,1,12,1,8);box(0,11,0,16,5,10);return canvas;
}
const tridentCanvases=new WeakMap();
export function drawTrident(c,image,p,time){
 let sprite=tridentCanvases.get(image);if(!sprite){sprite=document.createElement('canvas');sprite.width=sprite.height=64;tridentCanvases.set(image,sprite);}
 const x=sprite.getContext('2d');x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,64,64);x.imageSmoothingEnabled=false;x.drawImage(image,2,2,60,60);
 // The moving violet sheen is masked by the original item silhouette.
 x.globalCompositeOperation='source-atop';x.fillStyle='#9c63df33';x.fillRect(0,0,64,64);x.fillStyle='#f0bcff99';
 const shift=(time*26)%36;for(let k=-3;k<5;k++){x.beginPath();x.moveTo(k*36+shift,-5);x.lineTo(k*36+shift+7,-5);x.lineTo(k*36+shift-57,69);x.lineTo(k*36+shift-64,69);x.fill();}x.globalCompositeOperation='source-over';
 const velocity=p.body.velocity||{x:1,y:0},angle=Math.hypot(velocity.x,velocity.y)>.05?Math.atan2(velocity.y,velocity.x):p.body.angle;
 c.save();c.rotate(angle);c.fillStyle=p.returning?'#d6a0ff':'#65d7db';c.globalAlpha=p.returning?.7:.35;
 for(let k=0;k<4;k++)c.fillRect(-31-k*9,-1+(k%2)*3,5,2);
 c.globalAlpha=1;c.rotate(Math.PI/4);c.drawImage(sprite,-32,-32);c.restore();
}
export function drawEndCrystal(c,image,time,p){
 const floor=p.ammo.size/2,scale=1.25;
 c.save();c.translate(0,floor-16*scale);c.scale(scale,scale);
 for(const f of nativeGeometry('end_crystal_entity',time,1)){
  const [u,v,w,h]=f.uv,[a,b,,d]=f.vertices;c.save();c.transform((b.x-a.x)/w,(b.y-a.y)/w,(d.x-a.x)/h,(d.y-a.y)/h,a.x,a.y);c.drawImage(image,u,v,w,h,0,0,w,h);c.restore();
 }
 c.restore();
}
