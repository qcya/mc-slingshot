import {inventoryFor} from './campaign.mjs';
import {buildOverworld,OVERWORLD_LEVELS} from './levels-overworld.mjs';
import {buildNether,NETHER_LEVELS} from './levels-nether.mjs';
import {buildEnd,END_LEVELS} from './levels-end.mjs';
export {buildPitchedRoof} from './level-builder.mjs';

// Existing callers retain the ten-stage overworld interface and local indices.
export const LEVELS=OVERWORLD_LEVELS;
export function levelsFor(world='overworld'){
 return world==='nether'?NETHER_LEVELS:world==='end'?END_LEVELS:OVERWORLD_LEVELS;
}
export function buildLevel(number,world='overworld'){
 const dimension=world==='nether'||world==='end'?world:'overworld';
 const level=Math.max(0,Math.min(9,Math.trunc(Number(number))||0));
 const scene=dimension==='nether'?buildNether(level):dimension==='end'?buildEnd(level):buildOverworld(level);
 return {...scene,number:level,shots:inventoryFor(level,dimension).reduce((n,count)=>n+count,0)};
}
