import {PixelGrid} from './pixels.mjs';
// A fixed, non-colliding material layer. Only explosion/black-hole damage erases it.
export class RearLayer{
 constructor(width,height){this.grid=new PixelGrid(width,height);}
 room(tx,ty,w,h,material){this.grid.fill(tx*16,ty*16,w*16,h*16,material);}
}
