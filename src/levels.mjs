import {inventoryFor} from './campaign.mjs';
import {buildOverworld,OVERWORLD_LEVELS} from './levels-overworld.mjs';
import {buildNether,NETHER_LEVELS} from './levels-nether.mjs';
import {buildEnd,END_LEVELS} from './levels-end.mjs';
import {buildSift,SIFT_LEVELS} from './levels-sift.mjs';
import {dimension} from './dimensions.mjs';
export {buildPitchedRoof} from './level-builder.mjs';

// Existing callers retain the ten-stage overworld interface and local indices.
export const LEVELS=OVERWORLD_LEVELS;
export function levelsFor(world='overworld'){
 dimension(world);return {overworld:OVERWORLD_LEVELS,nether:NETHER_LEVELS,end:END_LEVELS,sift:SIFT_LEVELS}[world];
}
export function buildLevel(number,world='overworld'){
 const id=dimension(world).id;
 const level=Math.max(0,Math.min(9,Math.trunc(Number(number))||0));
 const scene={overworld:buildOverworld,nether:buildNether,end:buildEnd,sift:buildSift}[id](level);
 return {...scene,number:level,shots:inventoryFor(level,id).reduce((n,count)=>n+count,0)};
}
