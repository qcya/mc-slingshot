export const WORLDS=Object.freeze([
 Object.freeze({id:'overworld',label:'主世界',board:2}),
 Object.freeze({id:'nether',label:'下界',board:3}),
 Object.freeze({id:'end',label:'末地',board:4}),
 Object.freeze({id:'sift',label:'筛界',board:5}),
]);
export const RANKINGS=Object.freeze([...WORLDS,Object.freeze({id:'total',label:'四界总榜',board:1})]);
export function ranking(id='overworld'){
 const board=RANKINGS.find(item=>item.id===id);if(!board)throw new RangeError('Unknown ranking.');return board;
}
// Changing the level architecture starts a fresh score season in every world.
export const SCORE_SEASON='three-dimensions-v2';
export function dimension(id='overworld'){
 const world=WORLDS.find(world=>world.id===id);
 if(!world)throw new RangeError('Unknown world.');
 return world;
}
// Progress keeps its original overworld key; time and queue bases are versioned
// independently by their callers so old runs never enter the current season.
export function worldSaveKey(base,id='overworld'){
 return dimension(id).id==='overworld'?base:`${base}.${id}`;
}
