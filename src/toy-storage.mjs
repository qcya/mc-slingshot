import {SAVE_KEY,readProgress} from './campaign.mjs';
import {TIME_SAVE_KEY,normalizeTimes,recordBestTime} from './timing.mjs';
import {WORLDS,worldSaveKey} from './dimensions.mjs';
export const TOY_LEGACY_CLOUD_KEY='mcslingshot_save_v1';
export const TOY_CLOUD_KEY='mcslingshot_save_v2';
export const TOY_DIMENSIONS_CLOUD_KEY='mcslingshot_dimensions_v2';
const PROFILE_KEY='mc-block-launch.profile.v1';
const worldKeys=WORLDS.flatMap(world=>[{key:worldSaveKey(SAVE_KEY,world.id),world:world.id,type:'progress'},{key:worldSaveKey(TIME_SAVE_KEY,world.id),world:world.id,type:'times'}]);
const OVERWORLD_KEYS=[SAVE_KEY,TIME_SAVE_KEY,PROFILE_KEY],DIMENSION_KEYS=worldKeys.filter(item=>item.world!=='overworld').map(item=>item.key),KEYS=[...OVERWORLD_KEYS,...DIMENSION_KEYS];
// The old cloud envelope is read only for overworld progress. Current season
// times and new worlds live in v2 keys, beyond the reach of old clients.
const CLOUD_GROUPS=[{key:TOY_CLOUD_KEY,keys:OVERWORLD_KEYS},{key:TOY_DIMENSIONS_CLOUD_KEY,keys:DIMENSION_KEYS}];
function parse(raw){try{return JSON.parse(raw);}catch{return null;}}
function validProfile(p){return p&&typeof p.nickname==='string'&&p.nickname.length<=64&&(p.provider==='toy'?typeof p.id==='string'&&p.id.startsWith('toy:')&&p.token===p.id:/^[\w-]{22}$/.test(p.id)&&/^[\w-]{43}$/.test(p.token));}
function limited(promise,ms){let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Toy service timed out')),ms))]).finally(()=>clearTimeout(timer));}

// Only Toy builds enable this adapter. Self-hosted save keys remain untouched.
export function createToyStorage({enabled=false,sdk=globalThis.toy,storage=globalThis.localStorage,autoFlush=true,now=Date.now,onStatus=()=>{},timeoutMs=6000}={}){
 let prefix=enabled?'mc-slingshot.toy.guest.':'',ready=false,dirty=false,revision=0,inflight=null,timer=null,retryAt=0,failures=0,lastError='',platformUser=null;
 const memory=new Map();
 const read=key=>{try{return storage.getItem(prefix+key)??memory.get(prefix+key)??null;}catch{return memory.get(prefix+key)??null;}};
 const write=(key,value)=>{memory.set(prefix+key,value);try{storage.setItem(prefix+key,value);}catch{/* Memory play remains available when site storage is blocked. */}};
 const status=()=>({enabled,ready,dirty,lastError,retryAfterMs:Math.max(0,retryAt-now())});
 function notify(){onStatus(status());}
 function schedule(ms=180){if(!autoFlush||!ready||timer||failures>=3)return;timer=setTimeout(()=>{timer=null;void flush();},ms);}
 function setItem(key,value){value=String(value);if(read(key)===value)return;write(key,value);if(enabled&&KEYS.includes(key)){dirty=true;revision++;if(failures>=3&&now()>=retryAt)failures=0;schedule();}}
 function snapshot(keys){const values={};for(const key of keys){const value=read(key);if(value!==null&&(key!==PROFILE_KEY||validProfile(parse(value))))values[key]=value;}return {version:1,values};}
 async function initialize(){
  if(!enabled)return;
  try{
   if(!sdk?.getUserProfile||!sdk?.getCloudStorage||!sdk?.setCloudStorage)throw Error('Toy SDK unavailable');
   const user=await limited(sdk.getUserProfile(),timeoutMs);
   if(typeof user?.toyOpenId!=='string'||!user.toyOpenId)throw Error('Toy account unavailable');
   platformUser=user;
   prefix=`mc-slingshot.toy.${encodeURIComponent(user.toyOpenId)}.`;
   const reply=await limited(sdk.getCloudStorage([...CLOUD_GROUPS.map(group=>group.key),TOY_LEGACY_CLOUD_KEY]),timeoutMs);
   const clouds=CLOUD_GROUPS.map(group=>{
    const raw=reply?.[group.key],cloud=raw?parse(raw):{version:1,values:{}};
    if(cloud?.version!==1||!cloud.values||typeof cloud.values!=='object'||Array.isArray(cloud.values))throw Error('Unsupported Toy save');
    return cloud;
   });
   for(const [index,group] of CLOUD_GROUPS.entries())for(const key of group.keys){
    const remote=clouds[index].values[key];if(remote===undefined)continue;
    if(typeof remote!=='string')throw Error('Invalid Toy save');
    const item=worldKeys.find(item=>item.key===key);
    if(item?.type==='progress'){const local=readProgress(read(key),item.world),other=readProgress(remote,item.world);write(key,JSON.stringify({unlocked:Math.max(local.unlocked,other.unlocked),completed:[...new Set([...local.completed,...other.completed])].sort((a,b)=>a-b)}));}
    else if(item?.type==='times'){let times=normalizeTimes(parse(read(key)));normalizeTimes(parse(remote)).forEach((value,stage)=>{if(value!==null)times=recordBestTime(times,stage,value);});write(key,JSON.stringify(times));}
    else{const p=parse(remote),local=parse(read(key));if(!validProfile(p))throw Error('Invalid Toy profile');if(!validProfile(local)||local.id!==p.id||!local.dirty)write(key,JSON.stringify(p));}
   }
   const legacy=reply?.[TOY_LEGACY_CLOUD_KEY]?parse(reply[TOY_LEGACY_CLOUD_KEY]):null;
   if(legacy?.version===1&&typeof legacy.values?.[SAVE_KEY]==='string'){
    const local=readProgress(read(SAVE_KEY),'overworld'),other=readProgress(legacy.values[SAVE_KEY],'overworld');
    write(SAVE_KEY,JSON.stringify({unlocked:Math.max(local.unlocked,other.unlocked),completed:[...new Set([...local.completed,...other.completed])].sort((a,b)=>a-b)}));
   }
   ready=true;lastError='';dirty=CLOUD_GROUPS.some((group,index)=>JSON.stringify(snapshot(group.keys))!==JSON.stringify(clouds[index]));notify();if(dirty)schedule();
  }catch(error){lastError=error.message||'Toy service unavailable';notify();}
 }
 async function flush(){
  if(!enabled||!ready||!dirty||now()<retryAt)return false;
  if(inflight)return inflight;
  if(timer){clearTimeout(timer);timer=null;}const version=revision,values=Object.fromEntries(CLOUD_GROUPS.map(group=>[group.key,JSON.stringify(snapshot(group.keys))]));
  inflight=(async()=>{
   // A write cannot be cancelled. Wait for the SDK's own settlement so an old
   // request never overlaps and later overwrites a newer snapshot.
   try{await Promise.resolve().then(()=>sdk.setCloudStorage(values));if(version===revision)dirty=false;failures=0;retryAt=0;lastError='';return true;}
   catch(error){failures++;retryAt=now()+Math.min(60000,1000*2**(failures-1));lastError=error.code===307044?'云存档请求较多，稍后重试':error.message||'云存档暂时不可用';return false;}
   finally{inflight=null;notify();if(dirty)schedule(Math.max(180,retryAt-now()));}
  })();return inflight;
 }
 return {initialize,getItem:read,setItem,flush,status,user:()=>platformUser,dispose(){if(timer)clearTimeout(timer);timer=null;}};
}
