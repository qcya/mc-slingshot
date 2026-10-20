const {test,expect}=require('@playwright/test');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {buildToy}=require('../scripts/build-toy.cjs');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg'};
const prefix='/toy/Stone_at_Full_Draw/';
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;}
async function close(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

for(const cors of [false,true])test(`Toy canvas remains readable when PNGs redirect to a separate CDN (CORS ${cors})`,async({page})=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mc-toy-cdn-')),build=buildToy({output:path.join(temp,'site')}),errors=[],cdnRequests=[];
 function serve(req,res){
  const relative=decodeURIComponent(req.url.split('?')[0]).replace(prefix,''),file=path.resolve(build.output,relative);
  if(!file.startsWith(build.output+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream',...(cors?{'Access-Control-Allow-Origin':'*'}:{})});fs.createReadStream(file).pipe(res);
 }
 const cdn=http.createServer((req,res)=>{cdnRequests.push(req.url);serve(req,res);}),cdnBase=await listen(cdn);
 const times=JSON.stringify(Array(10).fill(1000)),cloud={mcslingshot_save_v2:JSON.stringify({version:1,values:{'mc-block-launch.best-times.v2':times}}),mcslingshot_dimensions_v2:JSON.stringify({version:1,values:{'mc-block-launch.best-times.v2.nether':times}})};
 const host=`<script>const cloud=${JSON.stringify(cloud)};addEventListener('message',e=>{const m=e.data;if(m?.ns!=='toy-sdk-rpc')return;if(m.type==='ready'){e.source.postMessage({ns:m.ns,type:'hello',meta:{toyId:45155222811648}},e.origin);return;}if(m.type!=='request')return;const p=m.payload;let data={};if(p.kind==='getUserProfile')data={face:'',uname:'CDN tester',toyOpenId:'cdn-player'};if(p.kind==='storage'&&p.op==='get')data={items:p.keys.filter(k=>cloud[k]).map(k=>({key:k,value:cloud[k]}))};if(p.kind==='storage'&&p.op==='set')for(const item of p.items)cloud[item.key]=item.value;if(p.kind==='rank'&&p.op==='my')data={score:9999000};if(p.kind==='rank'&&p.op==='list')data={list:[]};e.source.postMessage({ns:m.ns,type:'response',id:m.id,payload:{ok:true,data}},e.origin);});</script><iframe src='${prefix}index.html' style='width:1200px;height:800px;border:0'></iframe>`;
 const site=http.createServer((req,res)=>{
  if(req.url==='/host.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(host);}
  if(/\/assets\/(textures|effects)\/.*\.png$/.test(req.url)){res.writeHead(302,{Location:cdnBase+req.url});return res.end();}
  serve(req,res);
 }),base=await listen(site);
 try{
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/host.html');const frame=page.frameLocator('iframe');
  await expect(frame.locator('#loadState')).toBeHidden({timeout:7000});
  await expect(frame.locator('#startScreen')).toBeVisible();
  const pixels=await frame.locator('#stage').evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.length);
  expect(pixels).toBe(1536*864*4);
  await frame.locator('#guideBtn').click();await expect(frame.locator('#itemGuide article')).toHaveCount(9);
  const sources=await frame.locator('#itemGuide img').evaluateAll(images=>images.map(im=>im.src));
  expect(sources.every(src=>src.startsWith('data:image/png;'))).toBe(true);
  await frame.locator('#guideBack').click();await frame.locator('#startScreen').click();await expect(frame.locator('#levelMenu')).toBeVisible();
  await frame.locator('#level-0').click();expect(await frame.locator('#stage').evaluate(()=>MCBlockLaunch.getStatus().screen)).toBe('play');
  await frame.locator('#stage').evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})));await frame.locator('#levelMenuBtn').click();
  await frame.locator('#levelMenu [data-world="end"]').click();await frame.locator('#level-0').click();
  await expect.poll(()=>frame.locator('#stage').evaluate(()=>MCBlockLaunch.getDiagnostics().enemies.some(e=>e.skin==='enderman'))).toBe(true);
  await frame.locator('#stage').evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect.poll(()=>frame.locator('#stage').evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.length)).toBe(pixels);
  expect(errors).toEqual([]);
  await fs.promises.mkdir('evidence/review-0.13.3',{recursive:true});
  await page.screenshot({path:`evidence/review-0.13.3/cdn-cors-${cors}.png`});
  await fs.promises.writeFile(`evidence/review-0.13.3/cdn-cors-${cors}.json`,JSON.stringify({cors,pixels,embeddedItemIcons:sources.length,cdnRequests,errors},null,2));
 }finally{await close(site);await close(cdn);fs.rmSync(temp,{recursive:true,force:true});}
});
