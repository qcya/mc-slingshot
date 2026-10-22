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
const nicknameKey=name=>name.normalize('NFKC').toLowerCase();
function uniqueNickname(state,name,exceptId){if(state.profiles.some(p=>p.id!==exceptId&&nicknameKey(p.nickname)===nicknameKey(name)))fail(409,'用户名已占用');}
function result(body,legacy=false){
  fields(body,legacy?['stage','shots','timeMs']:['stage','timeMs']);
  for(const [key,min,max] of [['stage',0,9],['timeMs',100,3600000],...(legacy?[['shots',1,50]]:[])])if(!Number.isSafeInteger(body[key])||body[key]<min||body[key]>max)fail(400,`Invalid ${key}.`);
  return {stage:body.stage,timeMs:body.timeMs};
}
function results(body,season){
  if(body?.season!==season)fail(426,'This score season has ended. Refresh the game before submitting.');
  fields(body,['stages','season']);
  if(!Array.isArray(body.stages)||body.stages.length!==10)fail(400,'A complete ten-stage result is required.');
  const stages=body.stages.map(score=>result(score));
  if(new Set(stages.map(score=>score.stage)).size!==10)fail(400,'Each stage must appear exactly once.');
  return stages;
}
function stageMap(profile,world){return world==='overworld'?profile.stages:profile.worlds[world]||{};}
function publicEntry(profile,world='overworld'){
  if(world==='total'){
    const entries=['overworld','nether','end','sift'].map(id=>publicEntry(profile,id));
    const stages=entries.flatMap((entry,worldIndex)=>entry.stages.map(s=>({...s,stage:worldIndex*10+s.stage})));
    return {id:profile.id,nickname:profile.nickname,completed:stages.length,totalTimeMs:stages.reduce((n,s)=>n+s.timeMs,0),stages};
  }
  const stages=Object.values(stageMap(profile,world)).sort((a,b)=>a.stage-b.stage);
  return {id:profile.id,nickname:profile.nickname,completed:stages.length,totalTimeMs:stages.reduce((n,s)=>n+s.timeMs,0),stages,...(profile.demo===true?{demo:true}:{})};
}
async function createLeaderboard({dataDir}){
  const {dimension,ranking,WORLDS,RANKINGS,SCORE_SEASON}=await import('../src/dimensions.mjs');
  function worldId(world='overworld',board=false){try{return (board?ranking:dimension)(world).id;}catch{fail(400,'Unknown world.');}}
  await fs.mkdir(dataDir,{recursive:true,mode:0o700});
  const filename=path.join(dataDir,'leaderboard.json');let state={version:4,profiles:[]},migrated=false,original;
  try{
    original=await fs.readFile(filename,'utf8');state=JSON.parse(original);
    if(![1,2,3,4].includes(state.version)||!Array.isArray(state.profiles)||state.profiles.length>10000)throw Error('Invalid leaderboard data.');
    migrated=state.version<4;
    const legacy=state.version===1;
    function normalizeStages(value,oldShots=false){
      if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid stored stages.');
      const scores=[];
      for(const [key,score] of Object.entries(value)){scores.push(result(score,oldShots));if(String(score.stage)!==key)throw Error('Invalid stored stage.');}
      if(!oldShots&&scores.length!==0&&scores.length!==10)throw Error('Invalid stored stage count.');
      return Object.fromEntries((scores.length===10?scores:[]).map(score=>[score.stage,score]));
    }
    const ids=new Set(),tokens=new Set();
    for(const p of state.profiles){
      if(typeof p.id!=='string'||! /^[a-zA-Z0-9_-]{22}$/.test(p.id)||typeof p.tokenHash!=='string'||! /^[a-f0-9]{64}$/.test(p.tokenHash)||nickname(p.nickname)!==p.nickname||!p.stages||typeof p.stages!=='object'||Array.isArray(p.stages)||ids.has(p.id)||tokens.has(p.tokenHash))throw Error('Invalid leaderboard profile.');
      ids.add(p.id);tokens.add(p.tokenHash);
      const previousStages=structuredClone(p.stages),previousWorlds=structuredClone(p.worlds??{});
      p.stages=normalizeStages(p.stages,legacy);
      if(state.version<3)p.worlds={nether:{},end:{}};
      else{
        if(!p.worlds||typeof p.worlds!=='object'||Array.isArray(p.worlds)||Object.keys(p.worlds).some(id=>!['nether','end','sift'].includes(id))||!Object.hasOwn(p.worlds,'nether')||!Object.hasOwn(p.worlds,'end'))throw Error('Invalid stored worlds.');
        p.worlds={nether:normalizeStages(p.worlds.nether),end:normalizeStages(p.worlds.end),sift:normalizeStages(p.worlds.sift??{})};
      }
      if(migrated){
        p.legacyStages=previousStages;p.legacyWorlds=previousWorlds;
        p.stages={};p.worlds={nether:{},end:{}};
      }
    }
    state.version=4;
  }catch(error){if(error.code!=='ENOENT')throw error;}
  async function persist(next){
    const temporary=`${filename}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    try{
      const handle=await fs.open(temporary,'wx',0o600);
      try{await handle.writeFile(JSON.stringify(next));await handle.sync();}finally{await handle.close();}
      await fs.rename(temporary,filename);
    }finally{await fs.rm(temporary,{force:true}).catch(()=>{});}
  }
  if(migrated){
    // Make one immutable copy before the atomic schema upgrade. A restart must
    // never replace the original backup with already-migrated player data.
    const backup=path.join(dataDir,'leaderboard.pre-v4.json'),temporary=`${backup}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    try{
      const handle=await fs.open(temporary,'wx',0o600);
      try{await handle.writeFile(original);await handle.sync();}finally{await handle.close();}
      // Linking the complete private file is atomic and refuses to replace an
      // existing backup. An interrupted backup write cannot leave a partial one.
      try{await fs.link(temporary,backup);}catch(error){if(error.code!=='EEXIST')throw error;}
    }finally{await fs.rm(temporary,{force:true}).catch(()=>{});}
    await persist(state);
  }
  let pending=Promise.resolve();
  function mutate(change){
    const operation=pending.then(async()=>{
      const next=structuredClone(state),output=change(next);
      await persist(next);state=next;
      return output;
    });pending=operation.catch(()=>{});return operation;
  }
  function authenticate(token){
    if(typeof token!=='string'||! /^[a-zA-Z0-9_-]{43}$/.test(token))fail(401,'Profile token required.');
    const profile=state.profiles.find(p=>p.tokenHash===hash(token));if(!profile)fail(401,'Profile token invalid.');return profile.id;
  }
  return {
    worlds:WORLDS.map(world=>world.id),
    rankings:RANKINGS.map(board=>board.id),scoreSeason:SCORE_SEASON,
    list(world='overworld'){world=worldId(world,true);return state.profiles.map(p=>publicEntry(p,world)).filter(entry=>entry.completed===(world==='total'?40:10)).sort((a,b)=>a.totalTimeMs-b.totalTimeMs||a.id.localeCompare(b.id)).slice(0,100).map((entry,index)=>({rank:index+1,...entry}));},
    profile(token,world='overworld'){world=worldId(world);const id=authenticate(token),p=state.profiles.find(p=>p.id===id);return {profile:{id,nickname:p.nickname},stages:publicEntry(p,world).stages};},
    async create(body){
      fields(body,['nickname']);const name=nickname(body.nickname),token=crypto.randomBytes(32).toString('base64url'),id=crypto.randomBytes(16).toString('base64url');
      return mutate(next=>{if(next.profiles.length>=10000)fail(503,'Player limit reached.');uniqueNickname(next,name);next.profiles.push({id,nickname:name,tokenHash:hash(token),stages:{},worlds:{nether:{},end:{},sift:{}}});return {profile:{id,nickname:name},token};});
    },
    async update(token,body){
      const id=authenticate(token);fields(body,['nickname']);const name=nickname(body.nickname);
      return mutate(next=>{const p=next.profiles.find(p=>p.id===id);if(p.demo===true)fail(403,'Test entry is read-only.');if(nicknameKey(p.nickname)!==nicknameKey(name))uniqueNickname(next,name,id);p.nickname=name;return {profile:{id,nickname:name}};});
    },
    async submit(token,body,world='overworld'){
      world=worldId(world);const id=authenticate(token),scores=results(body,SCORE_SEASON);
      return mutate(next=>{const p=next.profiles.find(p=>p.id===id);if(p.demo===true)return {entry:publicEntry(p,world)};if(world!=='overworld')p.worlds[world]??={};const stored=stageMap(p,world);for(const score of scores){const old=stored[score.stage];if(!old||score.timeMs<old.timeMs)stored[score.stage]=score;}return {entry:publicEntry(p,world)};});
    },
  };
}
module.exports={createLeaderboard,ApiError};
