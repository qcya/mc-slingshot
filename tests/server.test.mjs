import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
test('便捷服务器能提供模块和素材，不暴露 Git 配置',async t=>{
  const child=spawn(process.execPath,['scripts/serve.cjs','--port','0'],{cwd:process.cwd(),windowsHide:true});
  t.after(()=>child.kill());
  const url=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('server did not start')),6000);
    child.on('exit',code=>{clearTimeout(timer);reject(new Error(`server exited ${code}`));});
    child.stdout.on('data',data=>{const m=String(data).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});
  });
  const page=await fetch(url);assert.equal(page.status,200);assert.match(await page.text(),/<canvas/);
  const module=await fetch(`${url}/src/world.mjs`);assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/javascript/);
  assert.equal((await fetch(`${url}/.git/config`)).status,404);
  assert.equal((await fetch(`${url}/assets/textures/cobblestone.png`)).status,200);
});
