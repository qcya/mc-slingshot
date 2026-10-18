export const SAVE_KEY='mc-block-launch.campaign.v1';
export const CAMPAIGN_LENGTH=10;
// Slots: cobblestone, TNT, ender pearl, fire charge. Clear stages 1–3 to unlock each.
export const LOADOUTS=[
 [5,0,0,0], [5,1,0,0], [5,1,1,0], [6,3,0,1], [6,3,1,0],
 [5,2,1,0], [6,3,2,0], [0,4,2,1], [6,3,2,0], [7,4,2,0]
];
export function readProgress(raw){
 try{
  const p=JSON.parse(raw);
  if(Number.isInteger(p?.unlocked)&&p.unlocked>=1){
   const unlocked=Math.min(CAMPAIGN_LENGTH,p.unlocked);
   const completed=[...new Set(Array.isArray(p.completed)?p.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<unlocked):[])].sort((a,b)=>a-b);
   // Original saves capped at five; a cleared original campaign continues at six.
   const migrated=unlocked===5&&[0,1,2,3,4].every(n=>completed.includes(n))?6:unlocked;
   return {unlocked:migrated,completed};
  }
 }catch{}
 return {unlocked:1,completed:[]};
}
export function canEnter(progress,level){return Number.isInteger(level)&&level>=0&&level<CAMPAIGN_LENGTH&&level<progress.unlocked;}
export function finishLevel(progress,level){
 if(!canEnter(progress,level))return progress;
 return {unlocked:Math.max(Math.min(CAMPAIGN_LENGTH,progress.unlocked),Math.min(CAMPAIGN_LENGTH,level+2)),completed:[...new Set([...progress.completed,level])].sort((a,b)=>a-b)};
}
export function inventoryFor(level){return [...LOADOUTS[level]];}
// Permanent Minecraft-style positions; unlocks depend on campaign progress, not this level's supply.
export function hotbarSlots(progress){return Array.from({length:9},(_,i)=>i<4&&i<progress.unlocked?i:null);}
export function totalAmmo(inventory){return inventory.reduce((n,count)=>n+count,0);}
export function spendAmmo(inventory,slot){if(!Number.isInteger(slot)||!(inventory[slot]>0))return false;inventory[slot]--;return true;}
export function rewardFor(level){return level===0?'TNT':level===1?'末影珍珠':level===2?'烈焰弹':null;}
