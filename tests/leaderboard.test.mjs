import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {createGameServer}=require('../scripts/serve.cjs');

async function fixture(t,options={}) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mc-ranking-'));
  const dataDir=path.join(directory,'private');
  let server;
  async function start() {
    server=await createGameServer({dataDir,...options});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    return `http://127.0.0.1:${server.address().port}`;
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
const submit=(f,token,stage,shots,timeMs)=>f.request('/api/results',{method:'POST',token,body:{stage,shots,timeMs}});

test('anonymous identity and personal bests survive restart without exposing credentials',async t=>{
  const f=await fixture(t),player=await create(f,'  方块勇士  ');
  assert.equal(player.status,201);assert.equal(player.data.profile.nickname,'方块勇士');
  assert.match(player.data.token,/^[a-zA-Z0-9_-]{40,}$/);
  assert.equal((await submit(f,player.data.token,0,4,3000)).status,200);
  await f.restart();
  const rename=await f.request('/api/profile',{method:'PATCH',token:player.data.token,body:{nickname:'新名字'}});
  assert.equal(rename.status,200);assert.equal(rename.data.profile.id,player.data.profile.id);
  const board=await f.request('/api/leaderboard');
  assert.equal(board.data.entries[0].nickname,'新名字');assert.equal(board.data.entries[0].totalShots,4);
  assert.equal(JSON.stringify(board.data).includes(player.data.token),false);
  const stored=await fs.readFile(path.join(f.dataDir,'leaderboard.json'),'utf8');
  assert.equal(stored.includes(player.data.token),false);
});

test('best stage scores and ranking use completion, then shots, then time',async t=>{
  const f=await fixture(t),a=(await create(f,'A')).data,b=(await create(f,'B')).data,c=(await create(f,'C')).data;
  await submit(f,a.token,0,5,2000);await submit(f,a.token,0,7,1000);await submit(f,a.token,0,5,1500);
  await submit(f,b.token,0,2,1000);await submit(f,b.token,1,10,5000);
  await submit(f,c.token,0,5,1400);
  const board=(await f.request('/api/leaderboard')).data.entries;
  assert.deepEqual(board.map(x=>x.nickname),['B','C','A']);
  assert.deepEqual(board[2].stages,[{stage:0,shots:5,timeMs:1500}]);
  assert.deepEqual(board.map(x=>x.rank),[1,2,3]);
});

test('profiles appear on the public leaderboard only after their first clear',async t=>{
  const f=await fixture(t),player=(await create(f,'Waiting')).data;
  assert.deepEqual((await f.request('/api/leaderboard')).data.entries,[]);
  await submit(f,player.token,0,3,2000);
  assert.equal((await f.request('/api/leaderboard')).data.entries[0].nickname,'Waiting');
});

test('concurrent submissions preserve every stage and profile',async t=>{
  const f=await fixture(t),players=await Promise.all(Array.from({length:12},(_,i)=>create(f,`Player${i}`)));
  await Promise.all(players.flatMap(p=>Array.from({length:10},(_,stage)=>submit(f,p.data.token,stage,stage+1,100+stage))));
  await f.restart();
  const entries=(await f.request('/api/leaderboard')).data.entries;
  assert.equal(entries.length,12);assert.ok(entries.every(x=>x.completed===10&&x.totalShots===55&&x.totalTimeMs===1045));
});

test('API rejects malformed, unbounded and unauthorized input',async t=>{
  const f=await fixture(t),p=(await create(f,'合法_Name')).data;
  for(const nickname of ['', 'x'.repeat(17), '<script>', 'a\u202eb', 45, {name:'x'}])assert.equal((await create(f,nickname)).status,400);
  for(const body of [{stage:-1,shots:1,timeMs:1},{stage:10,shots:1,timeMs:1},{stage:0,shots:0,timeMs:1},{stage:0,shots:1,timeMs:3600001},{stage:'0',shots:1,timeMs:1},{stage:0,shots:1.5,timeMs:1},{stage:0,shots:1,timeMs:1,extra:true},null])assert.equal((await f.request('/api/results',{method:'POST',token:p.token,body})).status,400);
  assert.equal((await submit(f,'bad',0,1,1)).status,401);
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
  await client.submitResult(player.token,{stage:0,shots:2,timeMs:3000});
  assert.equal((await client.leaderboard()).entries[0].nickname,'手机玩家');
  await assert.rejects(client.submitResult('bad',{stage:0,shots:2,timeMs:3000}),error=>error.status===401);
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
  await client.submitResult(player.token,{stage:0,shots:1,timeMs:900});
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
