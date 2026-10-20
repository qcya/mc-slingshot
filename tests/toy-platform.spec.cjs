const {test,expect}=require('@playwright/test'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createGameServer}=require('../scripts/serve.cjs');
let server,dir,api,cloud={},reads=0,writes=0;
test.beforeAll(async({},info)=>{dir=await fs.mkdtemp(path.join(os.tmpdir(),'mc-toy-browser-'));server=await createGameServer({dataDir:dir,corsOrigins:[new URL(info.project.use.baseURL).origin]});await new Promise(r=>server.listen(0,'127.0.0.1',r));api=`http://127.0.0.1:${server.address().port}/`;});
test.afterAll(async()=>{server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));if(dir)await fs.rm(dir,{recursive:true,force:true});});
async function platform(page,{offline=false,account='toy-A'}={}){
 await page.exposeFunction('readToyCloud',async()=>{reads++;if(offline)throw Error('Cloud offline');return cloud;});
 await page.exposeFunction('writeToyCloud',async values=>{writes++;cloud={...cloud,...values};});
 await page.addInitScript(({api,account})=>{globalThis.MC_PLATFORM={toy:true,apiBaseUrl:api};globalThis.toy={getUserProfile:async()=>({toyOpenId:account}),getCloudStorage:async()=>window.readToyCloud(),setCloudStorage:values=>window.writeToyCloud(values)};},{api,account});
}
test('Toy mode uses real cross-origin nickname/ranking API and restores cloud identity in a fresh browser',async({browser})=>{
 cloud={};reads=writes=0;const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await platform(page);await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await require('./browser-helpers.cjs').enterStart(page);
 await page.locator('#nickname').fill('ToyCrossPlayer');await page.locator('#saveProfile').click();await expect(page.locator('#levelMenu')).toBeVisible();await expect.poll(()=>writes).toBeGreaterThan(0);
 await expect.poll(()=>JSON.stringify(cloud)).toContain('ToyCrossPlayer');expect(reads).toBe(1);
 await page.locator('#leaderboardBtn').click();await expect(page.locator('#leaderboardStatus')).toHaveText('还没有全通成绩，来成为第一位挑战者。');await expect(page.locator('#rankingRows tr')).toHaveCount(0);await page.locator('#leaderboardBack').click();
 await page.locator('#level-0').click();const box=await page.locator('#stage').boundingBox(),p=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher),x=box.x+p.x*box.width/1536,y=box.y+p.y*box.height/864;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-65,y+25,{steps:5});await page.waitForFunction(()=>MCBlockLaunch.getDiagnostics().preview.length===5);await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.mouse.up();expect(errors).toEqual([]);await context.close();
 const restored=await browser.newContext(),again=await restored.newPage();await platform(again);await again.goto('/');await again.waitForFunction(()=>window.MCBlockLaunch);await require('./browser-helpers.cjs').enterStart(again);await expect(again.locator('#levelMenu')).toBeVisible();await expect(again.locator('#profileBtn')).toHaveText('玩家：ToyCrossPlayer');await expect(again.locator('#profileMenu')).toBeHidden();await expect(again.locator('#cloudState')).toHaveText('Toy 云存档已连接');
 await again.screenshot({path:'evidence/toy-cloud-restored.png'});await restored.close();
});
test('Toy cloud failure preserves playable local mode without overwriting the remote save',async({page})=>{
 const before=JSON.stringify(cloud),priorWrites=writes;await platform(page,{offline:true,account:'offline-account'});await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await require('./browser-helpers.cjs').enterStart(page);await page.locator('#nickname').fill('ToyOfflinePlayer');await page.locator('#saveProfile').click();await expect(page.locator('#levelMenu')).toBeVisible();await expect(page.locator('#cloudState')).toHaveText('云存档暂未同步，进度已暂存本机');await page.locator('#level-0').click();await expect(page.locator('#stage')).toBeVisible();expect(JSON.stringify(cloud)).toBe(before);expect(writes).toBe(priorWrites);
});
