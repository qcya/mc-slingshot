export const TIME_SAVE_KEY='mc-block-launch.best-times.v1',TIME_QUEUE_KEY='mc-block-launch.pending.v2';
const valid=t=>Number.isSafeInteger(t)&&t>=100&&t<=3600000;
export function normalizeTimes(value){return Array.from({length:10},(_,i)=>valid(value?.[i])?value[i]:null);}
export function recordBestTime(value,stage,timeMs){
 const times=normalizeTimes(value);if(Number.isInteger(stage)&&stage>=0&&stage<10&&valid(timeMs))times[stage]=times[stage]===null?timeMs:Math.min(times[stage],timeMs);return times;
}
export function timeBundle(value){const times=normalizeTimes(value);return times.every(valid)?{stages:times.map((timeMs,stage)=>({stage,timeMs}))}:null;}
export function parseTimeBundle(value){
 if(!Array.isArray(value?.stages)||value.stages.length!==10)return null;const seen=new Set(),times=normalizeTimes(null);
 for(const s of value.stages){if(!Number.isInteger(s?.stage)||s.stage<0||s.stage>=10||seen.has(s.stage)||!valid(s.timeMs))return null;seen.add(s.stage);times[s.stage]=s.timeMs;}return timeBundle(times);
}
export function formatTime(value){const ms=Math.max(0,Math.round(value)||0);return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;}
