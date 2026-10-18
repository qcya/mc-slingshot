import {buildLevel} from './levels.mjs';

// A small oak cottage, built from whole blocks and real half-block stairs.
export function buildTitleScene(){
  const scene=buildLevel(0),{grid,rear,visual}=scene;
  grid.fill(19*16,0,13*16,14*16,0);rear.grid.fill(19*16,0,13*16,14*16,0);
  visual.rooms=[];visual.attics=[];visual.gables.clear();visual.roofTiles.clear();
  for(let x=22;x<=28;x++){
    grid.tile(x,13,16);
    for(let y=10;y<=12;y++)grid.tile(x,y,x===22||x===28?4:10);
  }
  for(const x of [23,27])grid.tile(x,11,6);
  grid.tile(25,11,17);grid.tile(25,12,18);
  for(let step=0;step<=4;step++){
    const left=21+step,right=29-step,ty=9-step;
    for(const [x,up] of left===right?[[left,null]]:[[left,true],[right,false]]){
      grid.fill(x*16,ty*16+8,16,8,15);
      if(up!==null)grid.fill(x*16+(up?8:0),ty*16,8,8,15);
      visual.roofTiles.add(ty*32+x);
      if(step){grid.tile(x,ty+1,15);visual.roofTiles.add((ty+1)*32+x);}
      if(step)rear.grid.fill(x*16,(ty+1)*16,16,(9-ty)*16,10);
    }
  }
  scene.enemies=[];scene.titleScene=true;return scene;
}
