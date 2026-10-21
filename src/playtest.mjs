// Compile-time only: ordinary source and Toy release builds cannot enable this
// mode by changing a URL or supplying a save with fake completion records.
export const PLAYTEST=typeof __MC_PLAYTEST__!=='undefined'&&__MC_PLAYTEST__===true;
export function playtestStorage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};}
export const playtestInventory=()=>Array(9).fill(99);
