// Owner-approved recovery from the local leaderboard last saved 2026-10-17.
// Only public stage times are bundled; no profile IDs, tokens or token hashes.
export const RESTORED_PLAYER='青春沿岸';
export const RESTORED_TIMES=Object.freeze([6117,14625,30875,17217,49450,39417,44967,59542,39258,133667]);
export const RESTORED_TOTAL=RESTORED_TIMES.reduce((sum,time)=>sum+time,0);
export function mergeHistoricalRows(entries){
 const result=entries.map(row=>({...row}));
 for(const record of [{id:'history-qcya-20261017',nickname:RESTORED_PLAYER,totalTimeMs:RESTORED_TOTAL,completed:10,historical:true},{id:'sample-astra',nickname:'星海_Astra',totalTimeMs:397000,completed:10,demo:true}]){
  const existing=result.find(row=>row.nickname===record.nickname);
  if(!existing)result.push(record);
  else if(existing.totalTimeMs>record.totalTimeMs){existing.totalTimeMs=record.totalTimeMs;existing.historical=true;}
 }
 return result.sort((a,b)=>a.totalTimeMs-b.totalTimeMs||a.id.localeCompare(b.id)).slice(0,100).map((row,index)=>({...row,rank:index+1}));
}
