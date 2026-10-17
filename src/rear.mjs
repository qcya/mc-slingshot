import {PixelGrid} from './pixels.mjs';
// Non-colliding material pixels, attached to actual foreground supports.
export class RearLayer{
 constructor(width,height){this.grid=new PixelGrid(width,height);this.links=new Map();}
 room(tx,ty,w,h,m,floorY,bounds){
  const g=this.grid;g.fill(tx*16,ty*16,w*16,h*16,m);
  for(let x=tx*16;x<(tx+w)*16;x++){
   const anchorY=typeof floorY==='function'?floorY(x):floorY,key=anchorY*g.width+x,pixels=[];for(let y=ty*16;y<(ty+h)*16;y++)pixels.push(y*g.width+x);
   const existing=this.links.get(key);if(existing)existing.pixels.push(...pixels);else this.links.set(key,{pixels,bounds});
  }
 }
 rebindMissing(fore){
  for(const [key,link] of [...this.links]){
   if(fore.cells[key])continue;
   const x=key%fore.width,y=Math.floor(key/fore.width),b=link.bounds;let nearest=-1,distance=Infinity;
   for(let yy=b.y0;yy<b.y1;yy++)for(let xx=b.x0;xx<b.x1;xx++){
    if(!fore.get(xx,yy))continue;const d=Math.abs(xx-x)+Math.abs(yy-y);
    if(d<distance){nearest=yy*fore.width+xx;distance=d;}
   }
   this.links.delete(key);
   if(nearest>=0){const other=this.links.get(nearest);if(other)other.pixels.push(...link.pixels);else this.links.set(nearest,link);}
   else for(const k of link.pixels)this.grid.set(k%fore.width,Math.floor(k/fore.width),0);
  }
 }
 take(indices,x0,y0){
  const result=[],g=this.grid;
  for(const anchor of indices){const link=this.links.get(anchor);if(!link)continue;
   for(const k of link.pixels){const m=g.cells[k];if(!m)continue;const x=k%g.width,y=Math.floor(k/g.width);
    result.push({x:x-x0,y:y-y0,m,hp:g.hp[k],tx:x,ty:y,anchorX:anchor%g.width-x0,anchorY:Math.floor(anchor/g.width)-y0});g.set(x,y,0);
   }this.links.delete(anchor);
  }return result;
 }
}
