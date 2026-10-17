export const SAVE_KEY='mc-block-launch.campaign.v1';
export const LOADOUTS=[[5,0,0],[4,1,0],[4,2,1],[4,2,2],[5,3,3]];
export function readProgress(raw){
 try{const p=JSON.parse(raw);if(Number.isInteger(p?.unlocked)&&p.unlocked>=1&&p.unlocked<=5)return {unlocked:p.unlocked,completed:Array.isArray(p.completed)?p.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<p.unlocked):[]};}catch{}
 return {unlocked:1,completed:[]};
}
export function canEnter(progress,level){return Number.isInteger(level)&&level>=0&&level<5&&level<progress.unlocked;}
export function finishLevel(progress,level){
 if(!canEnter(progress,level))return progress;
 return {unlocked:Math.max(progress.unlocked,Math.min(5,level+2)),completed:[...new Set([...progress.completed,level])].sort()};
}
export function inventoryFor(level){return [...LOADOUTS[level]];}
export function totalAmmo(inventory){return inventory.reduce((n,count)=>n+count,0);}
export function spendAmmo(inventory,slot){if(!Number.isInteger(slot)||!(inventory[slot]>0))return false;inventory[slot]--;return true;}
export function rewardFor(level){return level===0?'TNT':level===1?'末影珍珠':null;}
