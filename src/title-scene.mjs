import {buildLevel,buildPitchedRoof} from './levels.mjs';

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
  buildPitchedRoof(grid,rear,visual,21,29,9);
  scene.enemies=[];scene.titleScene=true;return scene;
}
