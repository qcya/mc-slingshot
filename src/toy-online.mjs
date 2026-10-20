import {timeBundle,parseTimeBundle} from './timing.mjs';
import {dimension} from './dimensions.mjs';
// The official SDK accepts integers from -2^24 through 2^24-1 and keeps the maximum.
// Centiseconds cover all ten allowed one-hour stage times without saturation.
const SCORE_BASE=10000000;
export const encodeTime=ms=>SCORE_BASE-Math.ceil(ms/10);
export const decodeTime=score=>(SCORE_BASE-score)*10;
function rows(value,depth=0){if(Array.isArray(value))return value;if(!value||typeof value!=='object'||depth>3)return null;for(const key of ['list','items','entries','rankList','ranks','data']){const result=rows(value[key],depth+1);if(result)return result;}return null;}
function ownScore(value){for(const item of [value,value?.data,value?.item,value?.myRank])if(Number.isInteger(item?.score))return item.score;return null;}
export function createToyOnlineClient({sdk=globalThis.toy,getUser=()=>null,getTimes=()=>[],now=Date.now,timeoutMs=8000}={}){
 let userPromise,blockedUntil=0,failures=0;
 const boards=new Map();
 function boardState(world){const config=dimension(world);if(!boards.has(config.board))boards.set(config.board,{score:null,cache:null,cachedAt:0,revision:0,readRevision:0,pending:Promise.resolve()});return {config,state:boards.get(config.board)};}
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
  async profile(token,world='overworld'){dimension(world);const p=await identity();return {profile:p.profile,stages:timeBundle(getTimes(world))?.stages||[]};},
  async submitResult(token,result,world='overworld'){
   const {config,state}=boardState(world);
   const bundle=parseTimeBundle(result);if(!bundle)throw Error('十关全通后才可提交排行榜');
   const score=encodeTime(bundle.stages.reduce((n,s)=>n+s.timeMs,0));
   // A board's submissions stay ordered; another world's score never suppresses it.
   const operation=state.pending.then(async()=>{
    if(state.score===null)state.score=ownScore(await call('getMyRank',{board:config.board,period:'all'}))??0;
    if(score>state.score){await call('submitScore',{board:config.board,score});state.score=score;state.cache=null;state.revision++;}
    return {entry:{...(await identity()).profile,totalTimeMs:decodeTime(state.score)}};
   });state.pending=operation.catch(()=>{});return operation;
  },
  async leaderboard(world='overworld'){
   const {config,state}=boardState(world),revision=state.revision;
   if(state.cache&&now()-state.cachedAt<15000)return state.cache;
   const readRevision=++state.readRevision;
   const reply=await call('getRankList',{board:config.board,period:'all',limit:100}),list=rows(reply);
   if(!list)throw Error(`Toy 榜单返回格式无法识别（${Object.keys(reply||{}).slice(0,4).join(',')}）`);
   const entries=list.map((row,index)=>{const u=row.user||row.userInfo||row.userProfile||row.player||row,score=Number(row.score);return {id:`toy:${u.toyOpenId||u.openId||u.mid||u.id||row.toyOpenId||index}`,nickname:String(u.nickname||u.uname||u.name||row.nickname||`玩家${index+1}`),totalTimeMs:decodeTime(score),completed:10};}).filter(e=>Number.isSafeInteger(e.totalTimeMs)&&e.totalTimeMs>=1000&&e.totalTimeMs<=36000000);
   const result={entries:entries.sort((a,b)=>a.totalTimeMs-b.totalTimeMs||a.id.localeCompare(b.id)).slice(0,100).map((entry,index)=>({...entry,rank:index+1}))};
   if(revision===state.revision&&readRevision===state.readRevision){state.cache=result;state.cachedAt=now();}return result;
  },
 };
}
