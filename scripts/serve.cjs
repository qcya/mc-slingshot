const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{exec}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const portFlag=process.argv.indexOf('--port');
const port=portFlag>=0?Number(process.argv[portFlag+1]):Number(process.env.PORT||8766);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.ogg':'audio/ogg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400);res.end('Bad URL');return;}
  if(pathname==='/')pathname='/index.html';
  const allowed=/^\/(index\.html|style\.css|game\.js|favicon\.ico)$/.test(pathname)||/^\/(assets|src|vendor)\//.test(pathname);
  const file=path.resolve(root,'.'+pathname);
  if(!allowed||!file.startsWith(root+path.sep)){res.writeHead(404);res.end('Not found');return;}
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache'});
    fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  });
});
let retried=false;
server.on('error',error=>{
  if(error.code==='EADDRINUSE'&&!retried&&port!==0){
    retried=true;console.log(`Port ${port} is busy; choosing a free local port.`);server.listen(0,'127.0.0.1');return;
  }
  console.error(`MC Block Launch: ${error.message}`);process.exitCode=1;
});
server.on('listening',()=>{
  const url=`http://127.0.0.1:${server.address().port}`;console.log(`MC Block Launch: ${url}\nKeep this window open. Ctrl+C to stop.`);
  if(process.argv.includes('--open')){
    if(process.platform==='win32')exec(`start "" "${url}"`,{windowsHide:true});
    else console.log('Open the address above in your browser.');
  }
});
server.listen(port,'127.0.0.1');
