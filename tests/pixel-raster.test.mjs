import test from 'node:test';
import assert from 'node:assert/strict';
import {PixelGrid} from '../src/pixels.mjs';
import {refreshPixelRaster} from '../src/pixel-raster.mjs';
import {Renderer} from '../src/renderer.mjs';
const createImage=(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)});
const shade=(grid,m,x,y)=>[m*7+(grid.get(x+1,y)?0:30),m*4+(grid.get(x,y-1)?0:25),m*2+(grid.get(x,y+1)?0:20),255];
function reference(grid){const image=createImage(grid.width,grid.height);for(let y=0;y<grid.height;y++)for(let x=0;x<grid.width;x++){const m=grid.get(x,y);if(m)image.data.set(shade(grid,m,x,y),(y*grid.width+x)*4);}return image.data;}

test('a one-pixel excavation only shades its small neighborhood and reuses the image buffer',()=>{
 const grid=new PixelGrid(512,288);grid.fill(0,0,512,288,3);let allocations=0,calls=0;
 const build=()=>{allocations++;return createImage(512,288);},color=(m,x,y)=>{calls++;return shade(grid,m,x,y);};
 const first=refreshPixelRaster(null,grid,build,color,1),image=first.cache.image;calls=0;
 grid.set(200,180,0);const next=refreshPixelRaster(first.cache,grid,build,color,1);
 assert.equal(next.cache.image,image);assert.equal(allocations,1);assert.ok(calls<=9);assert.deepEqual(next.dirty,{x:199,y:179,width:3,height:3});
 assert.deepEqual(next.cache.image.data,reference(grid));
});

test('incremental pixels exactly match a full raster through removals, replacements and edge edits',()=>{
 const grid=new PixelGrid(47,29);grid.fill(0,0,47,29,3);let cache;
 for(let i=0;i<45;i++){
  grid.set((i*17)%47,(i*13)%29,i%3?0:6);grid.set(i%2?0:46,i%29,i%3?40:0);
  const result=refreshPixelRaster(cache,grid,createImage,(m,x,y)=>shade(grid,m,x,y),1);cache=result.cache;
  assert.deepEqual(cache.image.data,reference(grid));
 }
 assert.equal(refreshPixelRaster(cache,grid,createImage,(m,x,y)=>shade(grid,m,x,y),1).dirty,null);
});

test('changing scenes resets the raster even when the new scene has the same version',()=>{
 const first=new PixelGrid(8,8),second=new PixelGrid(8,8);first.fill(0,0,8,8,3);second.fill(0,0,8,8,6);
 const old=refreshPixelRaster(null,first,createImage,(m,x,y)=>shade(first,m,x,y),1);
 const current=refreshPixelRaster(old.cache,second,createImage,(m,x,y)=>shade(second,m,x,y),1);
 assert.notEqual(current.cache.image,old.cache.image);assert.deepEqual(current.cache.image.data,reference(second));
});

test('the production foreground and rear renderers reuse buffers across drill edits',()=>{
 const grid=new PixelGrid(32,32);grid.fill(0,0,32,32,3);let allocated=0;const uploaded=[];
 const context={createImageData(w,h){allocated++;return createImage(w,h);},putImageData(...args){uploaded.push(args);},drawImage(){}};
 const renderer={version:-1,rearVersion:-1,tctx:context,ctx:context,rearCanvas:{getContext:()=>context},scene:{visual:{}},assets:{pixel:()=>[90,100,110,255],averages:{stone:[120,120,120]}}};
 Renderer.prototype.cacheGrid.call(renderer,grid);grid.set(16,16,0);Renderer.prototype.cacheGrid.call(renderer,grid);
 assert.equal(allocated,1,'foreground allocates once per scene');assert.equal(uploaded.at(-1).length,7,'drill edits upload only a dirty rectangle');
 const world={rear:{grid},debris:[]};Renderer.prototype.drawRear.call(renderer,world);grid.set(17,16,0);Renderer.prototype.drawRear.call(renderer,world);
 assert.equal(allocated,2,'rear also allocates once per scene');
});
