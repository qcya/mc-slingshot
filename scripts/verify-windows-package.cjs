// Release QA: execute the actual unzipped BAT, not the developer's Node server.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),http=require('node:http'),{spawn,spawnSync}=require('node:child_process'),assert=require('node:assert/strict'),{chromium}=require('@playwright/test');
const {ready,chooseLevel,restart,shot}=require('../tests/browser-helpers.cjs');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async()=>{
 const zip=path.resolve(process.argv[2]),temp=fs.mkdtempSync(path.join(os.tmpdir(),'mc-player-verify-')),destination=path.join(temp,'玩家测试 & 空格');let child,browser,closed=false;
 const occupied=http.createServer((req,res)=>res.end('occupied test port'));
 try{
  const extracted=spawnSync(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command','Expand-Archive -LiteralPath $env:MC_VERIFY_ZIP -DestinationPath $env:MC_VERIFY_DEST'],{windowsHide:true,encoding:'utf8',env:{...process.env,MC_VERIFY_ZIP:zip,MC_VERIFY_DEST:destination}});assert.equal(extracted.status,0,extracted.stderr);
  const game=path.join(destination,'MC_Block_Launch'),manifest=JSON.parse(fs.readFileSync(path.join(game,'package-manifest.json')));
  for(const [file,expected] of Object.entries(manifest.files)){const resolved=path.resolve(game,file);assert.ok(resolved.startsWith(game+path.sep));assert.equal(hash(resolved),expected,file);}
  await new Promise(resolve=>occupied.listen(0,'127.0.0.1',resolve));
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>key.toLowerCase()!=='path'));env.Path=path.join(process.env.SystemRoot,'System32');env.PORT=String(occupied.address().port);
  child=spawn(process.env.ComSpec,['/d','/c','START_GAME.bat','--no-open'],{cwd:game,env,windowsHide:true,stdio:['ignore','pipe','pipe']});child.once('close',()=>closed=true);let output='';
  const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No startup address: '+output)),12000);child.stdout.on('data',d=>{output+=d;const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});child.stderr.on('data',d=>output+=d);child.once('exit',code=>{clearTimeout(timer);reject(Error(`Launcher exited ${code}: ${output}`));});});
  assert.notEqual(new URL(url).port,env.PORT);assert.equal(await (await fetch(`http://127.0.0.1:${env.PORT}`)).text(),'occupied test port');
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({baseURL:url,viewport:{width:1536,height:1000}}),page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});await ready(page);
  const levels=[];for(let n=0;n<10;n++){if(n)await chooseLevel(page,n);const state=await page.evaluate(()=>MCBlockLaunch.getStatus());assert.equal(state.level,n+1);assert.equal(state.physics,'Matter.js');levels.push({level:state.level,inventory:state.inventory});}
  await chooseLevel(page,2);const weapons=[];
  for(const [slot,id] of [[1,'cobble'],[2,'tnt'],[3,'ender']]){
   await restart(page);await shot(page,slot);
   await page.waitForFunction(kind=>{const s=MCBlockLaunch.getStatus();return kind==='tnt'?s.explosions>0:kind==='ender'?s.portals>0:s.removed>0;},id,{timeout:8000});weapons.push({id,...await page.evaluate(()=>MCBlockLaunch.getStatus())});
  }
  await chooseLevel(page,3);await shot(page,4,135*Math.cos(.24),135*Math.sin(.24));await page.waitForFunction(()=>MCBlockLaunch.getStatus().burning>0,null,{timeout:8000});weapons.push({id:'fire',...await page.evaluate(()=>MCBlockLaunch.getStatus())});
  await page.keyboard.press('Escape');await page.locator('#levelMenuBtn').click();await page.screenshot({path:'evidence/windows-player-menu.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={version:manifest.gameVersion,zip:path.basename(zip),zipSha256:hash(zip),runtime:manifest.runtime.version,verifiedFiles:Object.keys(manifest.files).length,isolatedPath:true,unicodeAndAmpersandPath:true,occupiedPortFallback:true,levels,weapons,consoleErrors:errors,failedResources:failed};
  fs.writeFileSync('evidence/windows-player-package.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({version:report.version,verifiedFiles:report.verifiedFiles,isolatedPath:true,occupiedPortFallback:true,levels:levels.length,weapons:weapons.map(w=>w.id),consoleErrors:errors,failedResources:failed}));
 }finally{
  if(browser)await browser.close();
  if(child){const completion=closed?Promise.resolve():new Promise(resolve=>child.once('close',resolve));if(child.exitCode===null)await new Promise(resolve=>{const kill=spawn(path.join(process.env.SystemRoot,'System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true});kill.once('close',resolve);});await completion;}
  await new Promise(resolve=>occupied.close(resolve));
  const resolved=fs.realpathSync(temp);assert.ok(resolved.startsWith(fs.realpathSync(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('mc-player-verify-'));await fs.promises.rm(resolved,{recursive:true,force:true,maxRetries:10,retryDelay:100});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
