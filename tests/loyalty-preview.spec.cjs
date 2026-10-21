const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {buildToy}=require('../scripts/build-toy.cjs');
const {aim}=require('./browser-helpers.cjs');
let tmp,server,base;
test.beforeAll(async()=>{
 tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mc-loyalty-preview-'));const built=buildToy({output:path.join(tmp,'site'),playtest:true});
 server=http.createServer((req,res)=>{const file=path.resolve(built.output,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0].slice(1));if(!file.startsWith(built.output+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg'})[path.extname(file)]||'text/plain'});fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/`;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});});
test('one loyal trident uses durability, blocks duplicate throws in flight, and returns before the next throw',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(base);await page.waitForFunction(()=>window.MCBlockLaunch);
 await page.locator('#levelMenu [data-world="sift"]').click();await page.locator('#level-0').click();
 expect(await page.evaluate(()=>MCBlockLaunch.getStatus().inventory)).toEqual([0,0,0,0,0,0,0,0,3]);
 const item=page.locator('#ballbar button').nth(8);await expect(item.locator('.stack-count')).toHaveText('');await expect(item.locator('.durability')).toBeVisible();await expect(item).toHaveAttribute('aria-label',/耐久 3\/3/);
 await aim(page,-10,80);await page.mouse.up();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().tridentDurability)).toBe(2);
 await page.clock.runFor(550);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().ammoBodies.some(p=>p.id==='trident'))).toBe(true);
 await aim(page,-10,80);await page.mouse.up();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(1);
 await page.clock.runFor(3000);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().ammoBodies.some(p=>p.id==='trident'))).toBe(false);
 await expect(item).toHaveAttribute('aria-label',/耐久 2\/3/);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().ended)).toBe(false);
 await aim(page,-10,80);await page.mouse.up();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(2);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().tridentDurability)).toBe(1);
 expect(errors).toEqual([]);
});
test('new native bosses and Sift species render in the actual browser without startup errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.MCBlockLaunch);
 for(const [world,skin] of [['nether','wither'],['end','ender_dragon'],['sift','sift_echo_golem']]){
  await page.locator(`#levelMenu [data-world="${world}"]`).click();await page.locator('#nextPage').click();await page.locator('#level-9').click();
  const status=await page.evaluate(()=>MCBlockLaunch.getDiagnostics());expect(status.enemies.some(e=>e.skin===skin)).toBe(true);
  await page.screenshot({path:test.info().outputPath(`${world}-boss.png`)});await page.locator('#playtestLevels').click();await page.locator('#prevPage').click();
 }
 expect(errors).toEqual([]);
});
