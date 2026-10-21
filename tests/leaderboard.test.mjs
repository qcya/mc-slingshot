import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {SCORE_SEASON} from '../src/dimensions.mjs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {createGameServer}=require('../scripts/serve.cjs');

test('four-world total is derived from complete world records and survives a server restart',async t=>{
 const f=await fixture(t),created=await f.request('/api/profile',{method:'POST',body:{nickname:'FourWorlds'}}),token=created.data.token;
 for(const world of ['overworld','nether','end']){
  const reply=await f.request(`/api/results?world=${world}`,{method:'POST',token,body:{season:SCORE_SEASON,stages:stages(1200)}});assert.equal(reply.status,200);
 }
 assert.deepEqual((await f.request('/api/leaderboard?world=total')).data.entries,[]);
 assert.equal((await f.request('/api/results?world=sift',{method:'POST',token,body:{season:SCORE_SEASON,stages:stages(1500)}})).status,200);
 await f.restart();const entries=(await f.request('/api/leaderboard?world=total')).data.entries;
 assert.equal(entries[0].completed,40);assert.equal(entries[0].totalTimeMs,51000);
 for(const world of ['overworld','nether','end'])assert.equal((await f.request(`/api/profile?world=${world}`,{token})).data.stages[0].timeMs,1200);
});

test('Toy CORS preflight and authenticated calls allow only configured exact origins',async t=>{
 const origin='https://www.bilibili.com',f=await fixture(t,{corsOrigins:[origin]});
 const headers={Origin:origin,'Sec-Fetch-Site':'cross-site'};
 const preflight=await f.request('/api/profile',{method:'OPTIONS',headers:{...headers,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type, authorization'}});
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);assert.equal(preflight.headers.get('access-control-allow-credentials'),null);
 const created=await f.request('/api/profile',{method:'POST',body:{nickname:'ToyPlayer'},headers});assert.equal(created.status,201);assert.equal(created.headers.get('access-control-allow-origin'),origin);
 assert.equal((await f.request('/api/profile',{token:created.data.token,headers})).status,200);
 const duplicate=await f.request('/api/profile',{method:'POST',body:{nickname:'ToyPlayer'},headers});assert.equal(duplicate.status,409);assert.equal(duplicate.headers.get('access-control-allow-origin'),origin);
 for(const bad of ['https://www.bilibili.com.evil.example','null','http://www.bilibili.com']){
  const response=await f.request('/api/profile',{method:'OPTIONS',headers:{Origin:bad,'Access-Control-Request-Method':'POST'}});assert.equal(response.status,403);assert.equal(response.headers.get('access-control-allow-origin'),null);
 }
 assert.equal((await f.request('/api/profile',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'DELETE'}})).status,405);
 assert.equal((await f.request('/api/profile',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'x-arbitrary'}})).status,403);
 assert.equal((await f.request('/api/profile',{method:'POST',body:{nickname:'Untrusted'},headers:{Origin:'https://evil.example','Sec-Fetch-Site':'cross-site'}})).status,403);
 assert.equal((await f.request('/api/leaderboard',{headers})).status,200);
 assert.equal((await f.request('/style.css',{headers})).headers.get('access-control-allow-origin'),null);
});

async function fixture(t,options={},initialState) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mc-ranking-'));
  const dataDir=path.join(directory,'private');
  if(initialState){await fs.mkdir(dataDir);await fs.writeFile(path.join(dataDir,'leaderboard.json'),JSON.stringify(initialState));}
  let server;
  async function start() {
    // Windows may allocate a port which Fetch reserves (for example 10080).
    // Retry that fixture port without weakening production or rate-limit checks.
    for(let attempt=0;attempt<20;attempt++){
      server=await createGameServer({dataDir,...options});
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      const base=`http://127.0.0.1:${server.address().port}`;
      try{const response=await fetch(base);await response.body?.cancel();return base;}
      catch(error){await stop();if(error.cause?.message!=='bad port')throw error;}
    }
    throw Error('No Fetch-compatible test port available.');
  }
  async function stop() {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  let base=await start();
  t.after(async()=>{await stop();await fs.rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  return {
    dataDir,
    get baseUrl(){return base;},
    async restart(){await stop();base=await start();},
    async request(route,{method='GET',body,token,raw,headers={}}={}) {
      const response=await fetch(base+route,{method,headers:{...(body!==undefined||raw!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`} : {}),...headers},body:raw??(body===undefined?undefined:JSON.stringify(body))});
      const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
      return {status:response.status,data,headers:response.headers};
    },
  };
}
const create=(f,nickname)=>f.request('/api/profile',{method:'POST',body:{nickname}});
const stages=(timeMs=1000)=>Array.from({length:10},(_,stage)=>({stage,timeMs:typeof timeMs==='function'?timeMs(stage):timeMs}));
const submit=(f,token,scores=stages())=>f.request('/api/results',{method:'POST',token,body:{stages:scores,season:SCORE_SEASON}});

test('world-scoped client calls preserve independent scores and identity across restart',async t=>{
 const f=await fixture(t),{createOnlineClient}=await import('../src/online.mjs'),client=createOnlineClient({baseUrl:f.baseUrl}),p=await client.createProfile('Worlds');
 await client.submitResult(p.token,{stages:stages(3000)});
 await client.submitResult(p.token,{stages:stages(2000)},'nether');
 await client.submitResult(p.token,{stages:stages(1000)},'end');
 await f.restart();
 // Recreate the client because the fixture restart chooses a new port.
 const restored=createOnlineClient({baseUrl:f.baseUrl});
 for(const [world,time] of [['overworld',30000],['nether',20000],['end',10000]]){
  const board=await restored.leaderboard(world);assert.equal(board.entries.length,1);assert.equal(board.entries[0].totalTimeMs,time);assert.equal(board.entries[0].id,p.profile.id);
  assert.equal((await restored.profile(p.token,world)).stages[0].timeMs,time/10);
 }
 await assert.rejects(restored.leaderboard('moon'));
 for(const route of ['/api/leaderboard?world=moon','/api/profile?world=moon','/api/results?world=moon'])assert.equal((await f.request(route,{token:p.token,...(route.includes('results')?{method:'POST',body:{stages:stages(),season:SCORE_SEASON}}:{})})).status,400);
});

test('a legacy server cannot leak overworld records into a new world or receive its score',async()=>{
 const {createOnlineClient}=await import('../src/online.mjs'),calls=[];
 const client=createOnlineClient({fetchImpl:async(url,options)=>{
  calls.push({url,method:options.method});return new Response(JSON.stringify(url==='api/health'?{ok:true,version:'0.12.1'}:{stages:stages(1000),entries:[]}),{status:200,headers:{'Content-Type':'application/json'}});
 }});
 await assert.rejects(client.profile('token','nether'),error=>error.status===503);
 await assert.rejects(client.leaderboard('end'),error=>error.status===503);
 await assert.rejects(client.submitResult('token',{stages:stages(1000)},'nether'),error=>error.status===503);
 assert.ok(calls.every(call=>call.url==='api/health'&&call.method==='GET'));
});

test('old multidimension servers cannot restore old season times or receive new submissions',async()=>{
 const {createOnlineClient}=await import('../src/online.mjs'),calls=[];
 const client=createOnlineClient({fetchImpl:async(url,options)=>{
  calls.push({url,method:options.method});return new Response(JSON.stringify({ok:true,worlds:['overworld','nether','end']}),{status:200});
 }});
 for(const world of ['overworld','nether','end']){
  await assert.rejects(client.profile('token',world),error=>error.status===503);
  await assert.rejects(client.leaderboard(world),error=>error.status===503);
  await assert.rejects(client.submitResult('token',{stages:stages()},world),error=>error.status===503);
 }
 assert.ok(calls.every(call=>call.url==='api/health'&&call.method==='GET'));
});

for(const version of [1,2,3])test(`version ${version} migration archives old scores and starts three empty boards once`,async t=>{
 const token=crypto.randomBytes(32).toString('base64url'),oldStages=Object.fromEntries(stages(2300).map(s=>[s.stage,version===1?{...s,shots:1}:s]));
 const profile={id:crypto.randomBytes(16).toString('base64url'),nickname:'KeepMe',tokenHash:crypto.createHash('sha256').update(token).digest('hex'),stages:oldStages,...(version===3?{worlds:{nether:Object.fromEntries(stages(1800).map(s=>[s.stage,s])),end:{}}}:{})};
 const original={version,profiles:[profile]},f=await fixture(t,{},original),backup=path.join(f.dataDir,'leaderboard.pre-v4.json');
 assert.deepEqual(JSON.parse(await fs.readFile(backup,'utf8')),original);
 const migrated=JSON.parse(await fs.readFile(path.join(f.dataDir,'leaderboard.json'),'utf8'));assert.equal(migrated.version,4);
 assert.deepEqual(migrated.profiles[0].legacyStages,oldStages);assert.deepEqual(migrated.profiles[0].legacyWorlds,profile.worlds??{});
 assert.equal(migrated.profiles[0].tokenHash,profile.tokenHash);assert.equal(migrated.profiles[0].id,profile.id);
 for(const world of ['overworld','nether','end'])assert.deepEqual((await f.request(`/api/leaderboard?world=${world}`)).data.entries,[]);
 assert.deepEqual((await f.request('/api/profile',{token})).data,{profile:{id:profile.id,nickname:profile.nickname},stages:[]});
 assert.equal((await create(f,'keepme')).status,409);
 await f.request('/api/results?world=nether',{method:'POST',token,body:{stages:stages(1800),season:SCORE_SEASON}});await f.restart();
 assert.deepEqual(JSON.parse(await fs.readFile(backup,'utf8')),original);
 assert.equal((await f.request('/api/leaderboard?world=nether')).data.entries[0].totalTimeMs,18000);
 assert.deepEqual((await f.request('/api/leaderboard')).data.entries,[]);
});

test('legacy clients can read identity but cannot submit old times into any current board',async t=>{
 const f=await fixture(t),p=(await create(f,'Legacy')).data;
 for(const world of ['overworld','nether','end']){
  assert.equal((await f.request(`/api/results?world=${world}`,{method:'POST',token:p.token,body:{stages:stages()}})).status,426);
  assert.equal((await f.request(`/api/results?world=${world}`,{method:'POST',token:p.token,body:{stages:stages(),season:'old'}})).status,426);
  assert.deepEqual((await f.request(`/api/leaderboard?world=${world}`)).data.entries,[]);
 }
 assert.equal((await f.request('/api/profile',{token:p.token})).status,200);
 const health=(await f.request('/api/health')).data;assert.equal(health.scoreSeason,SCORE_SEASON);assert.deepEqual(health.worlds,['overworld','nether','end','sift']);assert.deepEqual(health.rankings,['overworld','nether','end','sift','total']);
});

test('anonymous identity and personal bests survive restart without exposing credentials',async t=>{
  const f=await fixture(t),player=await create(f,'  方块勇士  ');
  assert.equal(player.status,201);assert.equal(player.data.profile.nickname,'方块勇士');
  assert.match(player.data.token,/^[a-zA-Z0-9_-]{40,}$/);
  assert.equal((await submit(f,player.data.token,stages(3000))).status,200);
  await f.restart();
  const rename=await f.request('/api/profile',{method:'PATCH',token:player.data.token,body:{nickname:'新名字'}});
  assert.equal(rename.status,200);assert.equal(rename.data.profile.id,player.data.profile.id);
  const board=await f.request('/api/leaderboard');
  assert.equal(board.data.entries[0].nickname,'新名字');assert.equal(board.data.entries[0].totalTimeMs,30000);
  assert.deepEqual((await f.request('/api/profile',{token:player.data.token})).data,{profile:rename.data.profile,stages:stages(3000)});
  assert.equal(JSON.stringify(board.data).includes(player.data.token),false);
  const stored=await fs.readFile(path.join(f.dataDir,'leaderboard.json'),'utf8');
  assert.equal(stored.includes(player.data.token),false);
  assert.equal(stored.includes('shots'),false);assert.equal(JSON.parse(stored).version,4);
});

test('personal bests merge fastest times per stage and rank by their sum',async t=>{
  const f=await fixture(t),a=(await create(f,'A')).data,b=(await create(f,'B')).data,c=(await create(f,'C')).data;
  await submit(f,a.token,stages(2000));await submit(f,a.token,stages(s=>s===0?1000:3000));await submit(f,a.token,stages(1500));
  await submit(f,b.token,stages(1000));
  await submit(f,c.token,stages(1400));
  const board=(await f.request('/api/leaderboard')).data.entries;
  assert.deepEqual(board.map(x=>x.nickname),['B','C','A']);
  assert.deepEqual(board[2].stages,stages(s=>s===0?1000:1500));
  assert.equal(board[2].totalTimeMs,14500);assert.equal(JSON.stringify(board).includes('shots'),false);
  assert.deepEqual(board.map(x=>x.rank),[1,2,3]);
});

test('profiles appear only after a complete ten-stage bundle',async t=>{
  const f=await fixture(t),player=(await create(f,'Waiting')).data;
  assert.deepEqual((await f.request('/api/leaderboard')).data.entries,[]);
  assert.deepEqual((await f.request('/api/profile',{token:player.token})).data.stages,[]);
  assert.equal((await submit(f,player.token,stages().slice(0,9))).status,400);
  assert.deepEqual((await f.request('/api/leaderboard')).data.entries,[]);
  await submit(f,player.token,stages(2000));
  assert.equal((await f.request('/api/leaderboard')).data.entries[0].nickname,'Waiting');
});

test('the public board contains only the fastest 100 full clears',async t=>{
 const profiles=Array.from({length:105},(_,i)=>({id:crypto.randomBytes(16).toString('base64url'),nickname:`Rank${i}`,tokenHash:crypto.createHash('sha256').update(String(i)).digest('hex'),stages:Object.fromEntries(stages(1000+i).map(s=>[s.stage,s]))}));
 profiles.push({id:crypto.randomBytes(16).toString('base64url'),nickname:'NotFinished',tokenHash:crypto.createHash('sha256').update('partial').digest('hex'),stages:{}});
 const f=await fixture(t,{}, {version:4,profiles:profiles.map(p=>({...p,worlds:{nether:{},end:{}}}))}),response=await f.request('/api/leaderboard'),entries=response.data.entries;
 assert.equal(response.status,200);assert.equal(entries.length,100);assert.equal(entries[0].nickname,'Rank0');assert.equal(entries[99].nickname,'Rank99');assert.equal(entries[99].rank,100);assert.ok(entries.every(e=>e.completed===10));
});

test('nicknames are unique after normalization, including concurrent creation and rename',async t=>{
 const f=await fixture(t),first=(await create(f,'  Star  Sea  ')).data,other=(await create(f,'Other')).data;
 assert.equal((await create(f,'star sea')).status,409);assert.equal((await create(f,'ＳＴＡＲ ＳＥＡ')).status,409);
 assert.equal((await f.request('/api/profile',{method:'PATCH',token:other.token,body:{nickname:'STAR SEA'}})).status,409);
 assert.equal((await f.request('/api/profile',{method:'PATCH',token:first.token,body:{nickname:'Star Sea'}})).status,200);
 const race=await Promise.all([create(f,'Racer'),create(f,'racer')]);assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
 await f.restart();assert.equal((await create(f,'STAR SEA')).status,409);
});

test('legacy demonstration rows remain absent from every fresh board',async t=>{
 const token=crypto.randomBytes(32).toString('base64url'),p={id:crypto.randomBytes(16).toString('base64url'),nickname:'Sample',tokenHash:crypto.createHash('sha256').update(token).digest('hex'),demo:true,stages:Object.fromEntries(stages(39700).map(s=>[s.stage,s]))};
 const f=await fixture(t,{}, {version:2,profiles:[p]});
 for(const world of ['overworld','nether','end'])assert.deepEqual((await f.request(`/api/leaderboard?world=${world}`)).data.entries,[]);
 assert.equal((await create(f,'Sample')).status,409);
});

test('concurrent complete bundles atomically preserve independent stage bests and profiles',async t=>{
  const f=await fixture(t),players=await Promise.all(Array.from({length:12},(_,i)=>create(f,`Player${i}`)));
  const responses=await Promise.all(players.flatMap(p=>Array.from({length:10},(_,index)=>submit(f,p.data.token,stages(stage=>index===stage?100+stage:1000)))));
  assert.ok(responses.every(r=>r.status===200));
  await f.restart();
  const entries=(await f.request('/api/leaderboard')).data.entries;
  assert.equal(entries.length,12);assert.ok(entries.every(x=>x.completed===10&&x.totalTimeMs===1045));
});

test('equal total times use stable identity order',async t=>{
  const f=await fixture(t),a=(await create(f,'A')).data,b=(await create(f,'B')).data;
  await submit(f,a.token);await submit(f,b.token);
  const entries=(await f.request('/api/leaderboard')).data.entries;
  assert.deepEqual(entries.map(entry=>entry.id),[a.profile.id,b.profile.id].sort((a,b)=>a.localeCompare(b)));
});

test('invalid or unsupported stored data fails without overwriting player identities',async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mc-ranking-corrupt-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100}));
  const filename=path.join(directory,'leaderboard.json');
  const profile={id:crypto.randomBytes(16).toString('base64url'),tokenHash:'a'.repeat(64),nickname:'Preserve',stages:{0:{stage:0,timeMs:1000}}};
  for(const state of [{version:3,profiles:[profile]},{version:2,profiles:[profile]},{version:1,profiles:[{...profile,stages:{0:{stage:0,timeMs:1000,shots:0}}}]}]){
    const original=JSON.stringify(state);await fs.writeFile(filename,original);
    await assert.rejects(createGameServer({dataDir:directory}));
    assert.equal(await fs.readFile(filename,'utf8'),original);
  }
});

test('API rejects malformed, unbounded and unauthorized input',async t=>{
  const f=await fixture(t),p=(await create(f,'合法_Name')).data;
  for(const nickname of ['', 'x'.repeat(17), '<script>', 'a\u202eb', 45, {name:'x'}])assert.equal((await create(f,nickname)).status,400);
  const invalid=[null,{}, {stage:0,shots:1,timeMs:1000},{stages:null},{stages:stages().slice(0,9)},{stages:[...stages(),{stage:10,timeMs:1000}]},{stages:stages().map(()=>({stage:0,timeMs:1000}))},{stages:stages(),extra:true}];
  for(const value of [{stage:-1,timeMs:1000},{stage:10,timeMs:1000},{stage:'0',timeMs:1000},{stage:0,timeMs:99},{stage:0,timeMs:3600001},{stage:0,timeMs:100.5},{stage:0,timeMs:'1000'},{stage:0,timeMs:1000,shots:50}])invalid.push({stages:[value,...stages().slice(1)]});
  for(const body of invalid)assert.equal((await f.request('/api/results',{method:'POST',token:p.token,body:{...body,season:SCORE_SEASON}})).status,400);
  assert.equal((await submit(f,'bad')).status,401);
  assert.equal((await f.request('/api/profile')).status,401);
  assert.equal((await submit(f,p.token,stages(s=>s===0?100:3600000))).status,200);
  assert.equal((await f.request('/api/profile',{method:'PATCH',body:{nickname:'Hacker'}})).status,401);
  assert.equal((await f.request('/api/profile',{method:'POST',raw:'{broken'})).status,400);
  assert.equal((await f.request('/api/profile',{method:'POST',raw:'x'.repeat(5000)})).status,413);
  assert.equal((await f.request('/api/profile',{method:'PUT',body:{nickname:'X'}})).status,405);
  assert.equal((await f.request('/api/missing')).status,404);
});

test('static serving allows game resources but blocks private files and cross-origin writes',async t=>{
  const f=await fixture(t);
  assert.equal((await f.request('/api/health')).data.ok,true);
  assert.equal((await f.request('/')).status,200);
  for(const route of ['/.git/config','/scripts/leaderboard.cjs','/assets/../package.json','/src/%2e%2e/scripts/leaderboard.cjs','/assets/.secret','/data/leaderboard.json'])assert.equal((await f.request(route)).status,404);
  assert.equal((await f.request('/src/world.mjs')).status,200);
  assert.equal((await f.request('/',{method:'POST',raw:'{}'})).status,405);
  assert.equal((await f.request('/api/profile',{method:'POST',body:{nickname:'X'},headers:{Origin:'https://attacker.example'}})).status,403);
});

test('client supports a server base URL and reports authorization failures',async t=>{
  const f=await fixture(t);
  const modulePath=new URL('../src/online.mjs',import.meta.url);
  assert.equal(await fs.stat(modulePath).then(()=>true,()=>false),true,'online client module exists');
  const {createOnlineClient}=await import(modulePath.href);
  const client=createOnlineClient({baseUrl:f.baseUrl});
  const player=await client.createProfile('Browser');
  await client.updateProfile(player.token,'手机玩家');
  await client.submitResult(player.token,{stages:stages(3000)});
  assert.deepEqual((await client.profile(player.token)).stages,stages(3000));
  assert.equal((await client.leaderboard()).entries[0].nickname,'手机玩家');
  await assert.rejects(client.submitResult('bad',{stages:stages(3000)}),error=>error.status===401);
});

test('client profile and result requests work through a prefix-stripping trusted proxy',async t=>{
  const publicOrigin='https://public.example:8443',f=await fixture(t,{publicOrigin,trustProxy:true});
  const proxy=http.createServer((req,res)=>{
    if(!req.url.startsWith('/mc-block-launch/')){res.writeHead(404);res.end();return;}
    const headers={...req.headers,host:new URL(f.baseUrl).host,origin:publicOrigin,'x-forwarded-for':'198.51.100.10'};
    const upstream=http.request(f.baseUrl+req.url.slice('/mc-block-launch'.length),{method:req.method,headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
  });
  await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{proxy.closeAllConnections();proxy.close(resolve);}));
  const {createOnlineClient}=await import('../src/online.mjs');
  const client=createOnlineClient({baseUrl:`http://127.0.0.1:${proxy.address().port}/mc-block-launch/`});
  const player=await client.createProfile('Prefix');await client.updateProfile(player.token,'Renamed');
  await client.submitResult(player.token,{stages:stages(900)});
  assert.deepEqual((await client.profile(player.token)).stages,stages(900));
  assert.equal((await client.leaderboard()).entries[0].nickname,'Renamed');
});

test('rate limit bounds a client and configured data cannot reside in the web root',async t=>{
  const f=await fixture(t);
  const responses=[];for(let i=0;i<245;i++)responses.push(await f.request('/api/health'));
  assert.ok(responses.some(response=>response.status===429));
  assert.ok(responses.some(response=>response.status===200));
  await assert.rejects(createGameServer({dataDir:path.resolve('assets/private-data')}),/outside/);
});

test('trusted reverse proxy rate limits the last forwarded client address separately',async t=>{
  const f=await fixture(t,{trustProxy:true});
  for(let i=0;i<245;i++){
    const response=await f.request('/api/health',{headers:{'X-Forwarded-For':`192.0.2.${i%200+1}`}});
    assert.equal(response.status,200);
  }
  const responses=[];for(let i=0;i<241;i++)responses.push(await f.request('/api/health',{headers:{'X-Forwarded-For':`192.0.2.${i%200+1}, 198.51.100.1`}}));
  assert.equal(responses.at(-1).status,429);
});

test('direct LAN clients cannot spoof proxy headers when the trusted proxy peer is configured',async t=>{
  const f=await fixture(t,{trustProxy:true,trustedProxyAddress:'192.0.2.10'});
  let last;for(let i=0;i<241;i++)last=await f.request('/api/health',{headers:{'X-Forwarded-For':`198.51.100.${i%200+1}`}});
  assert.equal(last.status,429);
});

test('configured trusted proxy peer keeps distinct forwarded clients independent',async t=>{
  const f=await fixture(t,{trustProxy:true,trustedProxyAddress:'127.0.0.1'});
  for(let i=0;i<241;i++)assert.equal((await f.request('/api/health',{headers:{'X-Forwarded-For':`198.51.100.${i%200+1}`}})).status,200);
});

test('chunked oversized requests return a usable 413 response',async t=>{
  const f=await fixture(t);
  const status=await new Promise((resolve,reject)=>{
    const request=http.request(`${f.baseUrl}/api/profile`,{method:'POST',headers:{'Content-Type':'application/json'}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));});
    request.on('error',reject);request.write('a'.repeat(3000));request.end('b'.repeat(3000));
  });
  assert.equal(status,413);
});

test('static symlinks cannot expose private scripts even when the target is inside the game directory',async t=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'mc-static-'));
  t.after(()=>fs.rm(folder,{recursive:true,force:true,maxRetries:5,retryDelay:100}));
  const web=path.join(folder,'web');await fs.mkdir(path.join(web,'scripts'),{recursive:true});await fs.mkdir(path.join(web,'assets'));
  await fs.copyFile(new URL('../scripts/serve.cjs',import.meta.url),path.join(web,'scripts/serve.cjs'));
  await fs.writeFile(path.join(web,'scripts/private.json'),'secret');
  await fs.symlink(path.join(web,'scripts'),path.join(web,'assets','linked'),'junction');
  const {createGameServer:create}=require(path.join(web,'scripts/serve.cjs'));
  const server=await create({dataDir:path.join(folder,'data')});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/assets/linked/private.json`);await response.text();
  assert.equal(response.status,404);
  await fs.copyFile(new URL('../scripts/leaderboard.cjs',import.meta.url),path.join(web,'scripts/leaderboard.cjs'));
  const alias=path.join(folder,'data-alias');await fs.symlink(path.join(web,'assets'),alias,'junction');
  await assert.rejects(create({dataDir:alias}),/outside/);
});
