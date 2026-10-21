const {test,expect}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {buildToy}=require('../scripts/build-toy.cjs');
const {aim}=require('./browser-helpers.cjs');
test('review build opens forty maps and nine items without touching saves or online services',async({page})=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mc-free-playtest-')),built=buildToy({output:path.join(tmp,'site'),playtest:true}),calls=[],errors=[];
 const server=http.createServer((req,res)=>{const relative=req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0].slice(1),file=path.resolve(built.output,relative);if(!file.startsWith(built.output+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg'})[path.extname(file)]||'text/plain'});fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\/|bilibili|toy-sdk/.test(r.url()))calls.push(r.url());});
  await page.addInitScript(()=>{localStorage.setItem('mc-block-launch.best-times.v2','[7317]');localStorage.setItem('mc-block-launch.profile.v1','{"nickname":"Actual player"}');});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.MCBlockLaunch);
  await expect(page.locator('#levelMenu')).toBeVisible();await expect(page.locator('#profileMenu')).toBeHidden();
  await expect(page.locator('#levelMenu [data-world]')).toHaveCount(4);await expect(page.locator('#levelMenu [data-world="sift"]')).toBeEnabled();
  await page.locator('#levelMenu [data-world="sift"]').click();await page.locator('#nextPage').click();await expect(page.locator('#level-9')).toBeEnabled();await page.locator('#level-9').click();
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().inventory)).toEqual(Array(9).fill(99));
  await page.keyboard.press('8');await expect(page.locator('#gamehint')).toContainText('末地水晶');
  await page.locator('#playtestItemHelp').click();await expect(page.locator('#guideMenu')).toBeVisible();await expect(page.locator('[data-item="crystal"]')).toBeInViewport();await page.locator('#guideBack').click();
  expect(await page.evaluate(()=>MCBlockLaunch.getStatus().screen)).toBe('play');await aim(page,-110,25);await page.mouse.up();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().inventory[7])).toBe(98);
  await page.locator('#playtestLevels').click();await page.locator('#leaderboardBtn').click();await expect(page.locator('#guideMenu')).toBeVisible();
  await page.locator('#guideBack').click();await page.locator('#prevPage').click();await page.locator('#level-0').click();await page.keyboard.press('9');
  const move=require('../evidence/sift-playability.json')[0].history[0],home=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher);await aim(page,move.input.x-home.x,move.input.y-home.y);await page.mouse.up();
  await expect(page.locator('#resultFlag')).toHaveText('挑战成功',{timeout:10000});await expect(page.locator('#resultMsg')).toContainText('试玩不计入正式成绩');
  expect(await page.evaluate(()=>localStorage.getItem('mc-block-launch.best-times.v2'))).toBe('[7317]');expect(await page.evaluate(()=>localStorage.getItem('mc-block-launch.profile.v1'))).toBe('{"nickname":"Actual player"}');
  expect(calls).toEqual([]);expect(errors).toEqual([]);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
