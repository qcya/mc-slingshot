import {timeBundle,parseTimeBundle} from './timing.mjs';
// The official SDK accepts signed 24-bit integer scores and keeps the maximum.
// Centiseconds cover all ten allowed one-hour stage times without saturation.
const SCORE_BASE=10000000;
export const encodeTime=ms=>SCORE_BASE-Math.ceil(ms/10);
export const decodeTime=score=>(SCORE_BASE-score)*10;
function rows(value,depth=0){if(Array.isArray(value))return value;if(!value||typeof value!=='object'||depth>3)return null;for(const key of ['list','items','entries','rankList','ranks','data']){const result=rows(value[key],depth+1);if(result)return result;}return null;}
function ownScore(value){for(const item of [value,value?.data,value?.item,value?.myRank])if(Number.isInteger(item?.score))return item.score;return null;}
export function createToyOnlineClient({sdk=globalThis.toy,getUser=()=>null,getTimes=()=>[],now=Date.now,timeoutMs=8000}={}){
 let userPromise,myScore=null,rankCache=null,cachedAt=0,blockedUntil=0,failures=0;
 async function call(method,params){
  if(now()<blockedUntil)throw Object.assign(Error('排行榜请求较多，请稍后刷新'),{code:307044});
  if(typeof sdk?.[method]!=='function')throw Error('Toy 平台接口尚未就绪');let timer;
  try{const data=await Promise.race([sdk[method](params),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Toy 平台连接超时')),timeoutMs))]);failures=0;return data;}
  catch(error){if(error.code===307044){blockedUntil=now()+Math.min(60000,1000*2**failures++);throw Object.assign(Error('排行榜请求较多，请稍后刷新'),{code:307044});}throw error;}
  finally{clearTimeout(timer);}
 }
 async function identity(){
  const user=getUser()||await (userPromise??=call('getUserProfile').catch(error=>{userPromise=null;throw error;}));
  if(!user?.toyOpenId||!user.nickname)throw Error('请先登录 B 站，再刷新游戏');
  const id=`toy:${user.toyOpenId}`;return {profile:{id,nickname:user.nickname,provider:'toy'},token:id};
 }
 return {
  provider:'toy',createProfile:identity,updateProfile:identity,
  async profile(){const p=await identity();return {profile:p.profile,stages:timeBundle(getTimes())?.stages||[]};},
  async submitResult(token,result){
   const bundle=parseTimeBundle(result);if(!bundle)throw Error('十关全通后才可提交排行榜');
   const score=encodeTime(bundle.stages.reduce((n,s)=>n+s.timeMs,0));
   if(myScore===null)myScore=ownScore(await call('getMyRank',{board:1,period:'all'}))??0;
   if(score>myScore){await call('submitScore',{board:1,score});myScore=score;rankCache=null;}
   return {entry:{...(await identity()).profile,totalTimeMs:decodeTime(myScore)}};
  },
  async leaderboard(){
   if(rankCache&&now()-cachedAt<15000)return rankCache;
   const reply=await call('getRankList',{board:1,period:'all',limit:100}),list=rows(reply);
   if(!list)throw Error(`Toy 榜单返回格式无法识别（${Object.keys(reply||{}).slice(0,4).join(',')}）`);
   const entries=list.map((row,index)=>{const u=row.user||row.userInfo||row.userProfile||row.player||row,score=Number(row.score);return {id:`toy:${u.toyOpenId||u.openId||u.mid||u.id||row.toyOpenId||index}`,nickname:String(u.nickname||u.uname||u.name||row.nickname||`玩家${index+1}`),totalTimeMs:decodeTime(score),completed:10};}).filter(e=>Number.isSafeInteger(e.totalTimeMs)&&e.totalTimeMs>=1000&&e.totalTimeMs<=36000000);
   // This is the user-requested illustrative row, not a submitted platform score.
   if(!entries.some(e=>e.nickname==='星海_Astra'))entries.push({id:'sample-astra',nickname:'星海_Astra',totalTimeMs:397000,completed:10,demo:true});
   entries.sort((a,b)=>a.totalTimeMs-b.totalTimeMs||a.id.localeCompare(b.id));rankCache={entries:entries.slice(0,100).map((e,i)=>({...e,rank:i+1}))};cachedAt=now();return rankCache;
  },
 };
}
