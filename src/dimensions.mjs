export const WORLDS=Object.freeze([
 // Keep legacy map scores on board 1 when updating the existing Toy work.
 Object.freeze({id:'overworld',label:'主世界',board:2}),
 Object.freeze({id:'nether',label:'下界',board:3}),
 Object.freeze({id:'end',label:'末地',board:4}),
]);
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
