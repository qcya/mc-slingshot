import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {AMMO} from '../src/config.mjs';
import {rewardFor,finishLevel} from '../src/campaign.mjs';
import {recordBestTime,timeBundle,formatTime} from '../src/timing.mjs';
import {dimension} from '../src/dimensions.mjs';
const source=fs.readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
const resultSource=source.slice(source.indexOf('function result(win){'),source.indexOf('function animateLauncher('));
const iconSource=source.slice(source.indexOf('function iconUrl('),source.indexOf('function hud('));

for(const [world,level,slot]of [['overworld',0,1],['overworld',1,2],['overworld',2,3],['nether',2,5],['nether',5,6],['end',2,8]]){
 test(`${world} stage ${level+1} reward uses its real nine-slot icon and saves progress`,()=>{
  const nodes=new Map(),saved=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{toggle(name,hidden){this[name]=hidden;}}});return nodes.get(id);};
  const context=vm.createContext({AMMO,assets:{icons:Object.fromEntries(AMMO.map(ammo=>[ammo.id,{src:`${ammo.sprite}.png`}]))},HTMLCanvasElement:class{},state:{world,level},progress:{unlocked:level+1,completed:[]},world:{time:1.5},bestTimes:[],rewardFor,finishLevel,recordBestTime,timeBundle,formatTime,dimension,TIME_SAVE_KEY:'times',SAVE_KEY:'progress',$:node,currentWorld:()=>world,cancelDrag(){},saveWorld:(key,value)=>saved.push([key,JSON.parse(JSON.stringify(value))]),queueBestTimes(){},syncResults(){},menus(){},levelsFor:()=>Array(10)});
  vm.runInContext(iconSource+resultSource+'result(true);',context);
  assert.equal(node('#resultTitle').textContent,`已解锁 ${AMMO[slot].label}`);
  assert.equal(node('#rewardIcon').src,`${AMMO[slot].sprite}.png`);
  assert.equal(node('#rewardIcon').classList.hidden,false);
  assert.equal(context.progress.unlocked,level+2);
  assert.deepEqual(saved.map(([key])=>key),['progress','times']);
 });
}
