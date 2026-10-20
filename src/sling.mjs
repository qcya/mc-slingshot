import {clamp} from './config.mjs';
export const SLING_HOME={x:285,y:545};
// Centers of the leather wraps on the inside of the two fork tips.
export const SLING_FRAME={x:216,y:498,width:138,height:174,ground:672,left:{x:249,y:516},right:{x:321,y:516}};
export function pouchRotation(vx,vy){return Math.hypot(vx,vy)<.001?Math.PI/2:Math.atan2(vy,vx)+Math.PI/2;}
export function pocketGeometry(p,size=28){
 const mid={x:(SLING_FRAME.left.x+SLING_FRAME.right.x)/2,y:(SLING_FRAME.left.y+SLING_FRAME.right.y)/2};
 const length=Math.hypot(p.x-mid.x,p.y-mid.y),v=length<.001?{x:0,y:1}:{x:(p.x-mid.x)/length,y:(p.y-mid.y)/length},u={x:v.y,y:-v.x},radius=size*.8;
 const tangent=(anchor,side)=>{
  const dx=anchor.x-p.x,dy=anchor.y-p.y,d=Math.hypot(dx,dy);if(d<.001)return {...anchor};
  const r=Math.min(radius,d*.9),a=r*r/(d*d),b=r*Math.sqrt(Math.max(0,1-r*r/(d*d)))/d;
  const points=[{x:p.x+a*dx-b*dy,y:p.y+a*dy+b*dx},{x:p.x+a*dx+b*dy,y:p.y+a*dy-b*dx}];
  return points.sort((a,b)=>side*((b.x-p.x)*u.x+(b.y-p.y)*u.y-(a.x-p.x)*u.x-(a.y-p.y)*u.y))[0];
 };
 const left=tangent(SLING_FRAME.left,-1),right=tangent(SLING_FRAME.right,1),local=q=>({x:(q.x-p.x)*u.x+(q.y-p.y)*u.y,y:(q.x-p.x)*v.x+(q.y-p.y)*v.y});
 return {left,right,localLeft:local(left),localRight:local(right),angle:Math.atan2(u.y,u.x),radius,belly:size/2+7};
}
export function pullSling(point){
 const dx=SLING_HOME.x-point.x,dy=SLING_HOME.y-point.y,length=Math.hypot(dx,dy),scale=length>135?135/length:1;
 const origin={x:SLING_HOME.x-dx*scale,y:clamp(SLING_HOME.y-dy*scale,410,648)};
 const vx=clamp((SLING_HOME.x-origin.x)*10.8,-1430,1430),vy=clamp((SLING_HOME.y-origin.y)*10.8,-1200,1200);
 return {origin,vx,vy,power:Math.min(1,Math.hypot(origin.x-SLING_HOME.x,origin.y-SLING_HOME.y)/135)};
}
