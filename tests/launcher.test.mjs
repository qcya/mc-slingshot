import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),windows=process.platform==='win32';
function fixture(t,bundled,lf=false){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mc-launcher-')),game=path.join(folder,'试玩 & game');fs.mkdirSync(game);
 const bat=fs.readFileSync(path.join(root,'START_GAME.bat'),'utf8');fs.writeFileSync(path.join(game,'START_GAME.bat'),lf?bat.replace(/\r\n/g,'\n'):bat.replace(/\r?\n/g,'\r\n'));fs.mkdirSync(path.join(game,'scripts'));fs.copyFileSync(path.join(root,'scripts/serve.cjs'),path.join(game,'scripts/serve.cjs'));
 fs.writeFileSync(path.join(game,'index.html'),'<canvas id="stage"></canvas>');
 if(bundled){fs.mkdirSync(path.join(game,'runtime'));fs.copyFileSync(process.execPath,path.join(game,'runtime/node.exe'));}
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>key.toLowerCase()!=='path'));env.Path=path.join(process.env.SystemRoot,'System32');env.PORT='0';
 const child=spawn(process.env.ComSpec||'cmd.exe',['/d','/c','START_GAME.bat','--no-open'],{cwd:game,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let closed=false;child.once('close',()=>closed=true);
 t.after(async()=>{
  const completion=closed?Promise.resolve():new Promise(resolve=>child.once('close',resolve));
  if(child.exitCode===null)await new Promise(resolve=>{const kill=spawn(path.join(process.env.SystemRoot,'System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true});kill.once('close',resolve);});
  await completion;
  const resolved=fs.realpathSync(folder),temp=fs.realpathSync(os.tmpdir())+path.sep;
  assert.ok(resolved.startsWith(temp)&&path.basename(resolved).startsWith('mc-launcher-'));await fs.promises.rm(resolved,{recursive:true,force:true,maxRetries:10,retryDelay:100});
 });return child;
}
for(const lf of [false,true])test(`Windows试玩包无开发环境启动，中文特殊目录与${lf?'LF':'CRLF'}换行可用`,{skip:!windows},async t=>{
 const child=fixture(t,true,lf);let output='';
 const url=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('No server address: '+output)),7000);
  child.stdout.on('data',data=>{output+=data;const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});
  child.stderr.on('data',data=>output+=data);child.on('exit',code=>{clearTimeout(timer);reject(new Error(`Launcher exited ${code}: ${output}`));});
 });
 const response=await fetch(url);assert.equal(response.status,200);assert.match(await response.text(),/<canvas/);
});
test('没有运行环境的源码包应明确报错并返回失败，不能悄悄跳到pause',{skip:!windows},async t=>{
 const child=fixture(t,false);let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 const code=await new Promise(resolve=>child.once('close',resolve));assert.notEqual(code,0,output);assert.match(output,/Windows.*试玩包|Windows.*player package/i);
});
