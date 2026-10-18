import {buildLevel} from './levels.mjs';

// A quiet, compact version of the village, rendered with the actual game assets.
// It is recreated on entry and never contributes to campaign times or results.
export function buildTitleScene(){
 const scene=buildLevel(0),{grid,rear,visual}=scene;
 grid.fill(19*16,0,13*16,14*16,0);rear.grid.fill(19*16,0,13*16,14*16,0);
 visual.rooms=[];visual.attics=[];visual.gables.clear();visual.roofTiles.clear();
 for(let x=22;x<=28;x++)grid.tile(x,13,16);
 rear.room(23,10,5,3,10);visual.rooms.push({x:23*16,y:10*16,w:5*16,h:3*16});
 for(const x of [22,28])for(let y=10;y<=12;y++)grid.tile(x,y,4);
 grid.tile(22,11,6);grid.tile(28,11,17);grid.tile(28,12,18);
 for(let x=21;x<=29;x++){
  const roofY=9-Math.min(x-21,29-x)*.5;
  rear.grid.fill(x*16,roofY*16+8,16,10*16-roofY*16-8,10);
  grid.fill(x*16,roofY*16,16,8,15);
 }
 rear.grid.tile(24,12,19);rear.grid.tile(27,12,21);
 scene.enemies=[];scene.titleScene=true;return scene;
}
