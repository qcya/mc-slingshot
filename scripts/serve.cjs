const http=require('node:http'),fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{exec}=require('node:child_process');
const root=fs.realpathSync.native(path.resolve(__dirname,'..'));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.ogg':'audio/ogg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
function httpError(status,message){return Object.assign(Error(message),{status});}
function isPublicPath(pathname){return (/^\/(index\.html|style\.css|game\.js|favicon\.ico)$/.test(pathname)||/^\/(assets|src|vendor)\//.test(pathname))&&!pathname.split('/').some(segment=>segment.startsWith('.')||segment.includes(':'));}
function insideRoot(file){const relative=path.relative(root,file);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));}
async function readBody(req){
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw httpError(415,'Use application/json.');
  if(Number(req.headers['content-length'])>4096){req.resume();throw httpError(413,'Request too large.');}
  let size=0,chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>4096){req.resume();throw httpError(413,'Request too large.');}chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw httpError(400,'Invalid JSON.');}
}
async function createGameServer(options={}){
  const dataDir=path.resolve(options.dataDir||process.env.MC_DATA_DIR||path.join(os.homedir(),'.mc-block-launch'));
  if(insideRoot(dataDir))throw Error('MC_DATA_DIR must be outside the public game directory.');
  let leaderboard;
  // Older portable launcher fixtures contain only serve.cjs. Keep static play usable.
  if(fs.existsSync(path.join(__dirname,'leaderboard.cjs'))){
    await fsp.mkdir(dataDir,{recursive:true,mode:0o700});
    if(insideRoot(await fsp.realpath(dataDir)))throw Error('MC_DATA_DIR must be outside the public game directory.');
    leaderboard=await require('./leaderboard.cjs').createLeaderboard({dataDir});
  }
  const rates=new Map();
  const corsOrigins=new Set(options.corsOrigins??(process.env.MC_CORS_ORIGINS||'').split(',').filter(Boolean));
  for(const origin of corsOrigins){const url=new URL(origin);if(url.origin!==origin||!['https:','http:'].includes(url.protocol))throw Error('Invalid MC_CORS_ORIGINS origin.');}
  function rate(req){
    const proxyAddress=options.trustedProxyAddress||process.env.MC_PROXY_ADDRESS,peer=(req.socket.remoteAddress||'').replace(/^::ffff:/,'');
    const trusted=(options.trustProxy??process.env.MC_TRUST_PROXY==='1')&&(!proxyAddress||peer===proxyAddress);
    const forwarded=trusted?String(req.headers['x-forwarded-for']||'').split(',').at(-1).trim():'';
    const key=forwarded&&require('node:net').isIP(forwarded)?forwarded:req.socket.remoteAddress||'unknown',now=Date.now();let bucket=rates.get(key);
    if(!bucket||now-bucket.start>=60000){bucket={start:now,count:0};rates.delete(key);if(rates.size>=8192)rates.delete(rates.keys().next().value);rates.set(key,bucket);}
    if(++bucket.count>240)throw httpError(429,'Too many requests; try again in a minute.');
  }
  const version=(()=>{try{return JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;}catch{return 'portable';}})();
  const server=http.createServer(async(req,res)=>{
    try{
      let pathname;try{pathname=decodeURIComponent((req.url||'').split('?')[0]);}catch{throw httpError(400,'Bad URL.');}
      if(!pathname.startsWith('/')||pathname.includes('\\')||pathname.includes('\0'))throw httpError(400,'Bad URL.');
      if(pathname==='/api'||pathname.startsWith('/api/')){
        const methods={'/api/health':['GET'],'/api/profile':['GET','POST','PATCH'],'/api/leaderboard':['GET'],'/api/results':['POST']};
        if(!Object.hasOwn(methods,pathname))throw httpError(404,'Not found.');
        const origin=req.headers.origin,corsAllowed=!!origin&&corsOrigins.has(origin);
        if(corsAllowed){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
        if(req.method==='OPTIONS'){
          if(!corsAllowed)throw httpError(403,'Origin not allowed.');
          if(!methods[pathname].includes(req.headers['access-control-request-method']))throw httpError(405,'Method not allowed.');
          const requested=String(req.headers['access-control-request-headers']||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
          if(requested.some(header=>!['content-type','authorization'].includes(header)))throw httpError(403,'Request headers not allowed.');
          res.writeHead(204,{'Access-Control-Allow-Methods':methods[pathname].join(', '),'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'});return res.end();
        }
        rate(req);
        if(!methods[pathname].includes(req.method)){res.setHeader('Allow',methods[pathname].join(', '));throw httpError(405,'Method not allowed.');}
        if(req.method!=='GET'){
          const allowedOrigin=options.publicOrigin||process.env.MC_PUBLIC_ORIGIN;
          if(origin){let valid=corsAllowed;try{valid||=origin===allowedOrigin||new URL(origin).host===req.headers.host;}catch{}if(!valid)throw httpError(403,'Origin not allowed.');}
          if(req.headers['sec-fetch-site']==='cross-site'&&!corsAllowed)throw httpError(403,'Origin not allowed.');
        }
        if(pathname==='/api/health')return send(res,200,{ok:true,version,...(leaderboard?{worlds:leaderboard.worlds,scoreSeason:leaderboard.scoreSeason}:{})});
        if(!leaderboard)throw httpError(503,'Leaderboard unavailable in this portable copy.');
        const worldParams=new URL(req.url,'http://localhost').searchParams.getAll('world');
        if(worldParams.length>1)throw httpError(400,'Specify one world.');
        const world=worldParams[0]??'overworld';
        if(pathname==='/api/leaderboard')return send(res,200,{entries:leaderboard.list(world)});
        const authorization=req.headers.authorization||'',token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
        if(pathname==='/api/profile'&&req.method==='GET')return send(res,200,leaderboard.profile(token,world));
        const body=await readBody(req);
        if(pathname==='/api/profile')return req.method==='POST'?send(res,201,await leaderboard.create(body)):send(res,200,await leaderboard.update(token,body));
        return send(res,200,await leaderboard.submit(token,body,world));
      }
      if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');throw httpError(405,'Method not allowed.');}
      if(pathname==='/')pathname='/index.html';
      if(!isPublicPath(pathname))throw httpError(404,'Not found.');
      const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw httpError(404,'Not found.');
      let stat,real;try{real=await fsp.realpath(file);stat=await fsp.stat(real);}catch{throw httpError(404,'Not found.');}
      if(!real.startsWith(root+path.sep)||!stat.isFile()||!isPublicPath('/'+path.relative(root,real).split(path.sep).join('/')))throw httpError(404,'Not found.');
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')return res.end();fs.createReadStream(real).on('error',()=>res.destroy()).pipe(res);
    }catch(error){if(res.headersSent)return res.destroy();if(!error.status)console.error('MC server request failed:',error.message);send(res,error.status||500,{error:error.status?error.message:'Server error. Please try again.'});}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
  return server;
}
module.exports={createGameServer};
if(require.main===module)(async()=>{
  const flag=process.argv.indexOf('--port'),port=Number(flag>=0?process.argv[flag+1]:process.env.PORT||8766),host=process.env.HOST||'127.0.0.1';
  if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid port.');
  const server=await createGameServer();let retried=false;
  server.on('error',error=>{if(error.code==='EADDRINUSE'&&!retried&&port!==0&&host==='127.0.0.1'){retried=true;console.log(`Port ${port} is busy; choosing a free local port.`);server.listen(0,host);return;}console.error(`Stone at Full Draw: ${error.message}`);process.exitCode=1;});
  server.on('listening',()=>{const url=`http://${host==='0.0.0.0'?'127.0.0.1':host}:${server.address().port}`;console.log(`Stone at Full Draw: ${url}\nKeep this window open. Ctrl+C to stop.`);if(process.argv.includes('--open')){if(process.platform==='win32')exec(`start "" "${url}"`,{windowsHide:true});else console.log('Open the address above in your browser.');}});
  server.listen(port,host);
})().catch(error=>{console.error(`Stone at Full Draw: ${error.message}`);process.exitCode=1;});
