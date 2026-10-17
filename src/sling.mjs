import {clamp} from './config.mjs';
export const SLING_HOME={x:285,y:545};
// The supplied sprite extends below ground; never expose its buried end.
export const SLING_FRAME={x:190,y:484,width:186,height:248,ground:672,left:{x:270,y:529},right:{x:320,y:545}};
export function pouchRotation(vx,vy){return Math.hypot(vx,vy)<.001?.15:Math.atan2(vy,vx)+Math.PI/2;}
export function pullSling(point){
 const dx=SLING_HOME.x-point.x,dy=SLING_HOME.y-point.y,length=Math.hypot(dx,dy),scale=length>135?135/length:1;
 const origin={x:SLING_HOME.x-dx*scale,y:clamp(SLING_HOME.y-dy*scale,410,648)};
 const vx=clamp((SLING_HOME.x-origin.x)*10.8,-1430,1430),vy=clamp((SLING_HOME.y-origin.y)*10.8,-1200,1200);
 return {origin,vx,vy,power:Math.min(1,Math.hypot(origin.x-SLING_HOME.x,origin.y-SLING_HOME.y)/135)};
}
