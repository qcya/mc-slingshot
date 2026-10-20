import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';
const {buildToy}=createRequire(import.meta.url)('../scripts/build-toy.cjs');
test('Toy build contains executable relative assets and native SDK config but no home API or private data',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mc-toy-build-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));const {output}=buildToy({output:path.join(temp,'site')});
 const html=fs.readFileSync(path.join(output,'index.html'),'utf8');assert.match(html,/src="toy-config.js"/);assert.match(html,/src="vendor\/toy-sdk.min.js"/);assert.ok(html.indexOf('toy-config.js')<html.indexOf('defer src="game.js"'));assert.doesNotMatch(html,/type="module"/);
 const config=fs.readFileSync(path.join(output,'toy-config.js'),'utf8');assert.match(config,/"ranking":"toy"/);assert.doesNotMatch(config,/qcya.fun|apiBaseUrl/);
 for(const f of ['game.js','assets/textures/cobblestone.png','vendor/matter.min.js'])assert.ok(fs.existsSync(path.join(output,f)),f);
 const script=fs.readFileSync(path.join(output,'game.js'),'utf8');
 for(const directory of ['textures','effects'])for(const name of fs.readdirSync(path.join('assets',directory)).filter(n=>n.endsWith('.png'))){
  const key=`assets/${directory}/${name}`,data=`data:image/png;base64,${fs.readFileSync(key).toString('base64')}`;
  assert.ok(script.includes(key)&&script.includes(data),`${key} must be embedded byte-for-byte for origin-clean canvas use`);
 }
 for(const name of fs.readdirSync('assets/sfx').filter(n=>n.endsWith('.ogg'))){
  const key=`assets/sfx/${name}`,data=`data:audio/ogg;base64,${fs.readFileSync(key).toString('base64')}`;
  assert.ok(script.includes(key)&&script.includes(data),`${key} must retain its original audio bytes in local-file previews`);
 }
 for(const f of ['.git','node_modules','scripts','src','connection.json','package.json','leaderboard.json'])assert.ok(!fs.existsSync(path.join(output,f)),f);
});
