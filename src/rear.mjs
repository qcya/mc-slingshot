import {PixelGrid} from './pixels.mjs';
// Dark, noncolliding walls: erase with the foreground above them, or directly by TNT.
export class RearLayer{
 constructor(width,height){this.grid=new PixelGrid(width,height);}
 room(tx,ty,w,h,material){this.grid.fill(tx*16,ty*16,w*16,h*16,material);}
}
