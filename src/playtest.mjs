import {inventoryFor} from './campaign.mjs';
// Compile-time only: ordinary source and Toy release builds cannot enable this
// mode by changing a URL or supplying a save with fake completion records.
export const PLAYTEST=typeof __MC_PLAYTEST__!=='undefined'&&__MC_PLAYTEST__===true;
// A release review uses formal gameplay with isolated, persistent local saves.
export const REVIEW=typeof __MC_REVIEW__!=='undefined'&&__MC_REVIEW__===true;
export function reviewStorage(storage=globalThis.localStorage){const prefix='mc-block-launch.review.1.0.0.';return {getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>storage.setItem(prefix+key,String(value))};}
export const preferencesStorage=(storage=globalThis.localStorage)=>REVIEW?reviewStorage(storage):storage;
export function playtestStorage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};}
export function playtestInventory(world,level){
 if(world==='sift'&&level===0)return [0,0,0,0,0,0,0,0,3];
 const inventory=[...Array(8).fill(99),3];inventory[5]=Math.min(1,inventoryFor(level,world)[5]||0);return inventory;
}
