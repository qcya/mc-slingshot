export const SAVE_KEY='mc-block-launch.campaign.v1';
export const CAMPAIGN_LENGTH=10;
import {normalizeTimes} from './timing.mjs';
// A legacy "unlocked:10" flag is not evidence of clearing a rebuilt map.
export function progressFromTimes(times){
 const current=normalizeTimes(times),completed=current.flatMap((time,i)=>time===null?[]:[i]);
 let firstMissing=0;while(firstMissing<10&&current[firstMissing]!==null)firstMissing++;
 return {unlocked:Math.min(10,firstMissing+1),completed};
}
export function worldUnlocked(id,overworldTimes,netherTimes){
 if(id==='overworld')return true;
 const overworldCleared=normalizeTimes(overworldTimes).every(time=>time!==null);
 return overworldCleared&&(id==='nether'||id==='end'&&normalizeTimes(netherTimes).every(time=>time!==null));
}
// Slots: cobblestone, TNT, ender pearl, fire charge. Clear stages 1–3 to unlock each.
export const LOADOUTS=[
 [5,0,0,0], [5,1,0,0], [5,1,1,0], [6,3,0,1], [6,3,1,0],
 [5,2,1,0], [8,3,2,0], [6,4,3,1], [6,3,2,0], [9,4,2,0]
];
// Each dimension keeps its own ten-stage campaign and finite supplies.
export const WORLD_LOADOUTS={
 nether:[
  [6,1,0,0,2,0,0,0,0], [9,1,0,0,2,0,0,0,0],
  [7,1,1,0,1,0,0,0,0], [8,2,0,0,1,2,0,0,0],
  [11,2,1,0,0,2,0,0,0], [8,3,1,0,1,1,0,0,0],
  [8,2,1,0,0,1,2,0,0], [9,3,1,0,0,1,1,0,0],
  [9,3,1,0,1,1,1,0,0], [10,4,2,0,0,1,1,0,0]
 ],
 end:[
  [6,0,1,0,0,0,0,2,0], [7,1,1,0,0,0,0,2,0],
  [8,1,1,0,0,1,0,1,0], [8,1,2,0,0,0,0,1,1],
  [8,3,1,0,1,0,0,0,1], [9,2,1,0,0,0,0,1,1],
  [9,2,2,0,0,1,0,1,0], [10,2,2,0,1,0,0,0,1],
  [10,3,2,0,0,1,0,1,0], [11,3,2,0,1,1,0,0,1]
 ]
};
export function readProgress(raw,world='overworld'){
 try{
  const p=JSON.parse(raw);
  if(Number.isInteger(p?.unlocked)&&p.unlocked>=1){
   const unlocked=Math.min(CAMPAIGN_LENGTH,p.unlocked);
   const completed=[...new Set(Array.isArray(p.completed)?p.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<unlocked):[])].sort((a,b)=>a-b);
   // Original saves capped at five; a cleared original campaign continues at six.
   const migrated=world==='overworld'&&unlocked===5&&[0,1,2,3,4].every(n=>completed.includes(n))?6:unlocked;
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
export function inventoryFor(level,world='overworld'){
 const table=world==='overworld'?LOADOUTS:WORLD_LOADOUTS[world];
 if(!table||!Number.isInteger(level)||!table[level])throw new RangeError('Invalid world or level');
 return [...table[level]];
}
// Permanent Minecraft-style positions; unlocks depend on campaign progress, not this level's supply.
export function hotbarSlots(progress,world='overworld'){
 const count=world==='end'?(progress.unlocked>=4?9:8):world==='nether'?(progress.unlocked>=7?7:progress.unlocked>=4?6:5):Math.min(4,progress.unlocked);
 return Array.from({length:9},(_,i)=>i<count?i:null);
}
export function totalAmmo(inventory){return inventory.reduce((n,count)=>n+count,0);}
export function spendAmmo(inventory,slot){if(!Number.isInteger(slot)||!(inventory[slot]>0))return false;inventory[slot]--;return true;}
export function rewardFor(level,world='overworld'){
 return world==='overworld'?(level===0?'TNT':level===1?'末影珍珠':level===2?'烈焰弹':null):world==='nether'?(level===2?'风弹':level===5?'喷溅型水瓶':null):world==='end'&&level===2?'铁砧':null;
}
