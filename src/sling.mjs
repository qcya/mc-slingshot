import {clamp} from './config.mjs';
export const SLING_HOME={x:205,y:545};
export function pullSling(point){
 const dx=SLING_HOME.x-point.x,dy=SLING_HOME.y-point.y,length=Math.hypot(dx,dy),scale=length>135?135/length:1;
 const origin={x:SLING_HOME.x-Math.max(0,dx*scale),y:clamp(SLING_HOME.y-dy*scale,410,648)};
 const vx=clamp((SLING_HOME.x-origin.x)*10.8,0,1430),vy=clamp((SLING_HOME.y-origin.y)*10.8,-1200,350);
 return {origin,vx,vy,power:Math.min(1,Math.hypot(origin.x-SLING_HOME.x,origin.y-SLING_HOME.y)/135)};
}
