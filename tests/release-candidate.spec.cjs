const {test,expect}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {buildToy}=require('../scripts/build-toy.cjs'),{shotPlan,enterStart}=require('./browser-helpers.cjs');
let folder,server,url;
test.beforeAll(async()=>{
 folder=fs.mkdtempSync(path.join(os.tmpdir(),'mc-release-candidate-'));const built=buildToy({output:path.join(folder,'site'),review:true});
 server=http.createServer((req,res)=>{const rel=req.url.split('?')[0],file=path.resolve(built.output,rel==='/'?'index.html':rel.slice(1));if(!file.startsWith(built.output+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg'})[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/`;
});
test.afterAll(async()=>{server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));if(folder){if(!folder.startsWith(path.join(os.tmpdir(),'mc-release-candidate-')))throw Error('Unexpected test folder');fs.rmSync(folder,{recursive:true,force:true});}});
async function boot(page){
 const errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\/|toy-sdk|bilibili/.test(r.url()))network.push(r.url());});
 await page.addInitScript(()=>{window.sdkCalls=0;window.toy={getUserProfile:async()=>{sdkCalls++;throw Error('Review must not access Toy');}};localStorage.setItem('mc-block-launch.best-times.v2',JSON.stringify(Array(10).fill(7777)));localStorage.setItem('mc-block-launch.profile.v1','{"nickname":"Formal player"}');localStorage.setItem('mc-block-launch.audio.v1','{"enabled":false,"volume":0.1}');localStorage.setItem('mc-block-launch.music.v1','off');});
 await page.clock.install();await page.goto(url+'?playtest=true&world=sift');await page.waitForFunction(()=>window.MCBlockLaunch);await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await enterStart(page);await page.locator('#nickname').fill('Release Reviewer');await page.locator('#saveProfile').click();await expect(page.locator('#levelMenu')).toBeVisible();return {errors,network};
}
for(const [name,size]of [['desktop',{width:1280,height:900}],['phone',{width:844,height:390}]])test(`1.0 review has formal locks and finite ammunition on ${name}`,async({page})=>{
 await page.setViewportSize(size);const report=await boot(page),status=await page.evaluate(()=>MCBlockLaunch.getStatus());expect(status).toMatchObject({version:'1.0.0',buildProfile:'review',unlocked:1});
 await expect(page.locator('#level-0')).toBeEnabled();await expect(page.locator('#level-1')).toBeDisabled();for(const world of ['nether','end','sift'])await expect(page.locator(`#levelMenu [data-world="${world}"]`)).toBeDisabled();
 expect(await page.evaluate(()=>MCBlockLaunch.switchWorld('sift'))).toBe(false);expect(await page.evaluate(()=>MCBlockLaunch.playLevel(9,true))).toBe(false);expect(await page.evaluate(()=>MCBlockLaunch.next())).toBe(false);
 expect(await page.locator('.playtest-tools').count()).toBe(0);expect(await page.locator('#playtestLevels').count()).toBe(0);await page.locator('#level-0').click();expect((await page.evaluate(()=>MCBlockLaunch.getStatus())).inventory).toEqual([5,0,0,0]);
 const dir='evidence/review-1.0.0/profile';fs.mkdirSync(dir,{recursive:true});await page.screenshot({path:`${dir}/${name}-formal-start.png`});expect(report.errors).toEqual([]);expect(report.network).toEqual([]);expect(await page.evaluate(()=>sdkCalls)).toBe(0);
});
test('release review persists a real win and audio preferences while formal keys remain unchanged',async({page})=>{
 test.setTimeout(60000);const report=await boot(page);await page.locator('#level-0').click();
 const before=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>!k.startsWith('mc-block-launch.review.1.0.0.'))));
 await page.keyboard.press('Escape');await page.locator('#settingsBtn').click();await page.locator('#soundToggle').click();await page.locator('#musicToggle').click();await page.locator('#settingsBack').click();await page.locator('#resume').click();
 for(const move of require('../evidence/playability-search.json')[0].history){const prior=await page.evaluate(()=>MCBlockLaunch.getStatus());if(prior.ended)break;await shotPlan(page,move);const wait=move.wait??6;await page.clock.runFor(wait*1000);while(await page.evaluate(t=>!MCBlockLaunch.getStatus().ended&&MCBlockLaunch.getStatus().time<t-1e-6,prior.time+wait))await page.clock.runFor(9);}
 await page.clock.runFor(1400);await expect(page.locator('#resultFlag')).toHaveText('挑战成功');expect((await page.evaluate(()=>MCBlockLaunch.getStatus())).unlocked).toBe(2);
 const after=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>!k.startsWith('mc-block-launch.review.1.0.0.'))));expect(after).toEqual(before);
 await page.reload();await page.waitForFunction(()=>window.MCBlockLaunch);await enterStart(page);await expect(page.locator('#level-1')).toBeEnabled();await expect(page.locator('#level-2')).toBeDisabled();expect((await page.evaluate(()=>MCBlockLaunch.getStatus())).unlocked).toBe(2);
 await page.locator('#leaderboardBtn').click();await expect(page.locator('#leaderboardMenu [data-world]')).toHaveCount(5);expect(report.errors).toEqual([]);expect(report.network).toEqual([]);expect(await page.evaluate(()=>sdkCalls)).toBe(0);
 fs.writeFileSync('evidence/review-1.0.0/profile/persistent-review.json',JSON.stringify({before,after,errors:report.errors,network:report.network,progressSurvivedReload:true},null,2));
});
