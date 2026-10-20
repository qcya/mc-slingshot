const {test,expect}=require('@playwright/test'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {buildToy}=require('../scripts/build-toy.cjs');
for(const nickname of ['青春沿岸','普通新玩家'])test(`official SDK recovery for ${nickname}`,async({page})=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'toy-recovery-')),build=buildToy({output:path.join(temp,'site')}),errors=[];
 const host=`<script>window.calls=[];const cloud={};let score=0;addEventListener('message',e=>{const m=e.data;if(m?.ns!=='toy-sdk-rpc')return;if(m.type==='ready'){e.source.postMessage({ns:m.ns,type:'hello',meta:{toyId:45155222811648}},e.origin);return;}if(m.type!=='request')return;const p=m.payload;calls.push(p);let data={};if(p.kind==='getUserProfile')data={face:'',uname:${JSON.stringify(nickname)},toyOpenId:'current-player'};if(p.kind==='storage'&&p.op==='get')data={items:p.keys.filter(k=>cloud[k]).map(k=>({key:k,value:cloud[k]}))};if(p.kind==='storage'&&p.op==='set')for(const item of p.items)cloud[item.key]=item.value;if(p.kind==='rank'&&p.op==='my')data={score,rank:score?1:0};if(p.kind==='rank'&&p.op==='submit')score=p.score;if(p.kind==='rank'&&p.op==='list')data={list:score?[{score,user:{toyOpenId:'current-player',nickname:${JSON.stringify(nickname)}}}]:[]};e.source.postMessage({ns:m.ns,type:'response',id:m.id,payload:{ok:true,data}},e.origin);});</script><iframe src='/toy/Stone_at_Full_Draw/index.html' style='width:1200px;height:800px;border:0'></iframe>`;
 const server=http.createServer((req,res)=>{if(req.url==='/host.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(host);}const file=path.join(build.output,req.url.split('?')[0].replace(/^\/toy\/Stone_at_Full_Draw\//,''));if(!file.startsWith(build.output+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg'})[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/host.html`);const frame=page.frameLocator('iframe');await expect(frame.locator('#startScreen')).toBeVisible();await frame.locator('#startScreen').click();await expect(frame.locator('#levelMenu')).toBeVisible();
  await frame.locator('#nextPage').click();await expect(frame.locator('#level-9')).toBeDisabled();
  expect(await page.evaluate(()=>calls.filter(p=>p.kind==='rank'&&p.op==='submit').length)).toBe(0);
  await frame.locator('#leaderboardBtn').click();
  for(const world of ['overworld','nether','end']){
   await frame.locator(`#leaderboardMenu [data-world="${world}"]`).click();
   await expect(frame.locator('#leaderboardStatus')).toHaveText('还没有全通成绩，来成为第一位挑战者。');
   await expect(frame.locator('#rankingRows tr')).toHaveCount(0);
  }
  expect(errors).toEqual([]);expect(await page.evaluate(()=>calls.filter(p=>p.kind==='rank'&&p.op==='submit').length)).toBe(0);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});}
});
