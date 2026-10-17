// Casual, client-reported scores; tokens protect identity, not score authenticity.
// Run one Node process per data directory. All mutations are serialized and
// atomically persisted before their responses. Keep data outside the web root.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
class ApiError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new ApiError(status,message);};
const hash=token=>crypto.createHash('sha256').update(token).digest('hex');
function nickname(value){
  if(typeof value!=='string'||value.length>100)fail(400,'Nickname must be 1–16 letters, numbers, spaces, _ or -.');
  const name=value.normalize('NFKC').trim().replace(/ +/g,' ');
  if(!name||Array.from(name).length>16||! /^[\p{L}\p{N}\p{M}_ -]+$/u.test(name)||!/[\p{L}\p{N}]/u.test(name))fail(400,'Nickname must be 1–16 letters, numbers, spaces, _ or -.');
  return name;
}
function fields(body,names){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==names.length||names.some(name=>!Object.hasOwn(body,name)))fail(400,'Invalid request fields.');}
function result(body){
  fields(body,['stage','shots','timeMs']);
  for(const [key,min,max] of [['stage',0,9],['shots',1,50],['timeMs',100,3600000]])if(!Number.isSafeInteger(body[key])||body[key]<min||body[key]>max)fail(400,`Invalid ${key}.`);
  return {stage:body.stage,shots:body.shots,timeMs:body.timeMs};
}
function publicEntry(profile){
  const stages=Object.values(profile.stages).sort((a,b)=>a.stage-b.stage);
  return {id:profile.id,nickname:profile.nickname,completed:stages.length,totalShots:stages.reduce((n,s)=>n+s.shots,0),totalTimeMs:stages.reduce((n,s)=>n+s.timeMs,0),stages};
}
async function createLeaderboard({dataDir}){
  await fs.mkdir(dataDir,{recursive:true,mode:0o700});
  const filename=path.join(dataDir,'leaderboard.json');let state={version:1,profiles:[]};
  try{
    state=JSON.parse(await fs.readFile(filename,'utf8'));
    if(state.version!==1||!Array.isArray(state.profiles)||state.profiles.length>10000)throw Error('Invalid leaderboard data.');
    const ids=new Set(),tokens=new Set();
    for(const p of state.profiles){
      if(typeof p.id!=='string'||! /^[a-zA-Z0-9_-]{22}$/.test(p.id)||typeof p.tokenHash!=='string'||! /^[a-f0-9]{64}$/.test(p.tokenHash)||nickname(p.nickname)!==p.nickname||!p.stages||typeof p.stages!=='object'||Array.isArray(p.stages)||ids.has(p.id)||tokens.has(p.tokenHash))throw Error('Invalid leaderboard profile.');
      ids.add(p.id);tokens.add(p.tokenHash);
      for(const [key,value] of Object.entries(p.stages)){result(value);if(String(value.stage)!==key)throw Error('Invalid stored stage.');}
    }
  }catch(error){if(error.code!=='ENOENT')throw error;}
  let pending=Promise.resolve();
  function mutate(change){
    const operation=pending.then(async()=>{
      const next=structuredClone(state),output=change(next),temporary=`${filename}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
      try{
        const handle=await fs.open(temporary,'wx',0o600);
        try{await handle.writeFile(JSON.stringify(next));await handle.sync();}finally{await handle.close();}
        await fs.rename(temporary,filename);state=next;
      }finally{await fs.rm(temporary,{force:true}).catch(()=>{});}
      return output;
    });pending=operation.catch(()=>{});return operation;
  }
  function authenticate(token){
    if(typeof token!=='string'||! /^[a-zA-Z0-9_-]{43}$/.test(token))fail(401,'Profile token required.');
    const profile=state.profiles.find(p=>p.tokenHash===hash(token));if(!profile)fail(401,'Profile token invalid.');return profile.id;
  }
  return {
    list(){return state.profiles.map(publicEntry).filter(entry=>entry.completed>0).sort((a,b)=>b.completed-a.completed||a.totalShots-b.totalShots||a.totalTimeMs-b.totalTimeMs||a.id.localeCompare(b.id)).slice(0,100).map((entry,index)=>({rank:index+1,...entry}));},
    async create(body){
      fields(body,['nickname']);const name=nickname(body.nickname),token=crypto.randomBytes(32).toString('base64url'),id=crypto.randomBytes(16).toString('base64url');
      return mutate(next=>{if(next.profiles.length>=10000)fail(503,'Player limit reached.');next.profiles.push({id,nickname:name,tokenHash:hash(token),stages:{}});return {profile:{id,nickname:name},token};});
    },
    async update(token,body){
      const id=authenticate(token);fields(body,['nickname']);const name=nickname(body.nickname);
      return mutate(next=>{const p=next.profiles.find(p=>p.id===id);p.nickname=name;return {profile:{id,nickname:name}};});
    },
    async submit(token,body){
      const id=authenticate(token),score=result(body);
      return mutate(next=>{const p=next.profiles.find(p=>p.id===id),old=p.stages[score.stage];if(!old||score.shots<old.shots||(score.shots===old.shots&&score.timeMs<old.timeMs))p.stages[score.stage]=score;return {entry:publicEntry(p)};});
    },
  };
}
module.exports={createLeaderboard,ApiError};
