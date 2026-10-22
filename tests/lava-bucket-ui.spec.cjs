const {test,expect}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {buildToy}=require('../scripts/build-toy.cjs'),{aim}=require('./browser-helpers.cjs');
let folder,server,url;
test.beforeAll(async()=>{
 folder=fs.mkdtempSync(path.join(os.tmpdir(),'mc-bucket-ui-'));const built=buildToy({output:path.join(folder,'site'),playtest:true});
 server=http.createServer((req,res)=>{const rel=req.url.split('?')[0],file=path.resolve(built.output,rel==='/'?'index.html':rel.slice(1));if(!file.startsWith(built.output+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg'})[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/`;
});
test.afterAll(async()=>{server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));if(folder){if(!folder.startsWith(path.join(os.tmpdir(),'mc-bucket-ui-')))throw Error('Unexpected test folder');fs.rmSync(folder,{recursive:true,force:true});}});
for(const [name,viewport]of [['desktop',{width:1536,height:1100}],['phone',{width:844,height:390}]])test(`one lava bucket becomes an unusable empty bucket on ${name}`,async({page})=>{
 const errors=[],online=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\/|bilibili|toy-sdk/.test(r.url()))online.push(r.url());});
 await page.setViewportSize(viewport);await page.clock.install();await page.goto(url);await page.waitForFunction(()=>window.MCBlockLaunch);await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.locator('#levelMenu [data-world="nether"]').click();await page.locator('#level-3').click();await page.keyboard.press('6');
 const slot=page.locator('#ballbar .ball').nth(5),fullIcon=await slot.locator('img').getAttribute('src');
 await expect(slot).toHaveAttribute('aria-label',/岩浆桶.*一次/);await expect(slot.locator('.stack-count')).toHaveText('');
 const initial=await page.evaluate(()=>MCBlockLaunch.getStatus());expect(initial.inventory[5]).toBe(1);expect(initial.selected).toBe('lava_bucket');
 await aim(page,-70,85);await page.mouse.up();
 await expect(slot).toHaveAttribute('aria-label',/空桶.*已用完/);expect(await slot.locator('img').getAttribute('src')).not.toBe(fullIcon);
 let after=await page.evaluate(()=>MCBlockLaunch.getStatus());expect(after.inventory[5]).toBe(0);expect(after.lavaBucketUsed).toBe(true);expect(after.launched).toBe(1);
 await page.clock.runFor(650);await aim(page,-90,50);await page.mouse.up();after=await page.evaluate(()=>MCBlockLaunch.getStatus());expect(after.launched).toBe(1);expect(after.inventory[5]).toBe(0);
 await page.clock.runFor(3200);const poured=await page.evaluate(()=>MCBlockLaunch.getStatus());expect(poured.lava.sources).toBe(initial.lava.sources+1);expect(poured.ammoBodies.some(p=>p.id==='lava_bucket')).toBe(false);
 const proof='evidence/review-0.15.0-beta7/ui';fs.mkdirSync(proof,{recursive:true});await page.screenshot({path:`${proof}/${name}-empty-bucket-and-flow.png`});
 await page.keyboard.press('r');expect((await page.evaluate(()=>MCBlockLaunch.getStatus())).inventory[5]).toBe(1);await expect(slot).toHaveAttribute('aria-label',/岩浆桶.*一次/);
 await page.locator('#playtestLevels').click();await page.locator('#levelMenu [data-world="end"]').click();await page.locator('#nextPage').click();await page.locator('#level-9').click();
 expect((await page.evaluate(()=>MCBlockLaunch.getStatus())).inventory[5]).toBe(0);await page.locator('#playtestItemHelp').click();await expect(page.locator('[data-item="lava_bucket"]')).toContainText('持续灼烧直到死亡');expect(await page.locator('[data-item="anvil"]').count()).toBe(0);
 fs.writeFileSync(`${proof}/${name}.json`,JSON.stringify({initial,poured,errors,online},null,2));expect(errors).toEqual([]);expect(online).toEqual([]);
});
