import {buildLevel} from './levels.mjs';

// A purpose-built village cottage. Only the menu uses these slab dimensions;
// campaign collision grids and all recorded shots stay on their full blocks.
export function buildTitleScene(){
  const scene=buildLevel(0),{grid,rear,visual}=scene;
  grid.fill(19*16,0,13*16,14*16,0);rear.grid.fill(19*16,0,13*16,14*16,0);
  visual.rooms=[];visual.attics=[];visual.gables.clear();visual.roofTiles.clear();visual.facings.clear();
  visual.rearPaint=null;
  const front=(x,y,w,h,m)=>grid.fill(x*16,y*16,w*16,h*16,m);
  const back=(x,y,w,h,m)=>rear.grid.fill(x*16,y*16,w*16,h*16,m);
  const window=(x,y,w=1,h=1)=>{
    back(x-.125,y-.125,w+.25,h+.25,14);back(x,y,w,h,6);
    back(x-.25,y+h,w+.5,.1875,14);back(x+w/2-.0625,y,.125,h,14);
  };
  // Cobblestone footing and oak corner posts form one continuous small house.
  front(22,13,7,1,16);back(23,10,5,3,10);
  visual.rooms.push({x:23*16,y:10*16,w:5*16,h:3*16});
  for(const x of [22,28])front(x,10,1,3,4);
  front(22,11,1,1,6);front(28,11,1,1,17);front(28,12,1,1,18);
  back(23,10,5,.25,14);back(23,12.75,5,.25,14);
  window(23.5,10.75,1.25,1.25);window(26,10.75,1.25,1.25);
  // A true overhanging stair roof: thin dark oak stair/slab edges enclose an
  // oak gable, with a generous eave beyond each corner post.
  const steps=[[21,9.5],[22,8.75],[23,8],[24,7.25],[25,6.5],[26,7.25],[27,8],[28,8.75],[29,9.5]];
  for(const [x,y] of steps){
    back(x,y+.5,1,10-y-.5,10);front(x,y,1,.5,13);
    // Stair risers join the slabs; they are part of the roof edge.
    if(x<25)front(x+1,y-.75,.1875,.75,13);
    if(x>25)front(x-.1875,y-.75,.1875,.75,13);
  }
  front(21,10,9,.1875,14);window(25,8,1,1);
  // A short capped chimney gives the roof an intentional asymmetry.
  back(27.5,6.25,.75,2.5,5);back(27.375,6.125,1,.25,16);
  back(23,12,1,1,19);back(27,12,1,1,21);
  scene.enemies=[];scene.titleScene=true;return scene;
}
