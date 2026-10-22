const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {buildToy}=require('../scripts/build-toy.cjs');
let tmp,server,base;
test.beforeAll(async()=>{
 tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mc-boss-specials-'));
 const built=buildToy({output:path.join(tmp,'site'),playtest:true});
 server=http.createServer((req,res)=>{
  const file=path.resolve(built.output,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0].slice(1));
  if(!file.startsWith(built.output+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg'})[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}/`;
});
test.afterAll(async()=>{
 if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 if(tmp)fs.rmSync(tmp,{recursive:true,force:true});
});

test('Dragon healing crystals appear in the shipped browser without consuming inventory or launching a shot',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.clock.install();
 await page.goto(base);await page.waitForFunction(()=>window.MCBlockLaunch);
 await page.locator('#levelMenu [data-world="end"]').click();await page.locator('#nextPage').click();await page.locator('#level-9').click();
 await page.clock.runFor(500);
 const first=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());
 expect(first.inventory).toEqual([99,99,99,99,99,0,99,99,3]);expect(first.launched).toBe(0);
 expect(first.ammoBodies.filter(p=>p.id==='crystal'&&p.placed)).toHaveLength(2);
 expect(first.enemies.find(e=>e.skin==='ender_dragon').healingCount).toBe(2);
 await page.clock.runFor(1500);
 const later=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());
 expect(later.inventory).toEqual(first.inventory);expect(later.launched).toBe(0);
 expect(later.enemies.find(e=>e.skin==='ender_dragon').hp).toBe(600);
 expect(errors).toEqual([]);
});
