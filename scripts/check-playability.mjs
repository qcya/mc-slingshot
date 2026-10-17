// Developer-only search. Each candidate replays the complete production Matter world.
// Every recorded shot is a legal launcher drag and spends a real finite ammo slot.
import {createRequire} from 'node:module';import fs from 'node:fs';
import {SiegeWorld} from '../src/world.mjs';import {buildLevel,LEVELS} from '../src/levels.mjs';import {SLING_HOME,pullSling} from '../src/sling.mjs';
import {inventoryFor} from '../src/campaign.mjs';import {AMMO} from '../src/config.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const candidates=[];
for(const kind of ['cobble','tnt','ender','fire'].filter(id=>AMMO.some(a=>a.id===id)))for(const power of [1,.875,.75,.625])for(const angle of [.12,.20,.28,.36,.40,.44,.48,.52,.56,.60,.64,.68,.72,.76,.80,.84,.88,.92,.96,1,1.06]){
 const shot=pullSling({x:SLING_HOME.x-135*power*Math.cos(angle),y:SLING_HOME.y+135*power*Math.sin(angle)});candidates.push({kind,...shot,angle,pull:power,wait:kind==='fire'?10:6});
}
function setup(level){const s=buildLevel(level),w=new SiegeWorld(M,{grid:s.grid,rear:s.rear});for(const e of s.enemies)w.addEnemy(e.x,e.feet,e.skin);return w;}
function simulate(w,shot){w.spawnProjectile(shot.kind,shot.origin.x,shot.origin.y,shot.vx,shot.vy);for(let i=0;i<120*(shot.wait??6);i++){w.step(1/120);w.events.length=0;if(w.enemies.every(e=>!e.alive))break;}return w;}
function dispose(w){M.Events.off(w.engine);M.Composite.clear(w.engine.world,false);M.Engine.clear(w.engine);}
const output=process.argv[3]||new URL('../evidence/playability-search.json',import.meta.url),requested=Number(process.argv[2]);
const result=requested&&fs.existsSync(output)?JSON.parse(fs.readFileSync(output)):[];
function robustFinish(level,plan){
 if(!plan)throw new Error('Robust search requires an existing valid prefix at the output path.');
 const scenarios=[];for(const initial of [0,.1,.25,.5,1])for(const delay of [0,.05,.1])scenarios.push({initial,delay});
 const history=[...plan.history],remaining=inventoryFor(level),slots={cobble:0,tnt:1,ender:2,fire:3};for(const p of history)remaining[slots[p.kind]]--;
 const replay=(extra,scenario)=>{const w=setup(level);for(let i=0;i<scenario.initial*120;i++)w.step(1/120);for(const p of [...history,...extra]){for(let i=0;i<scenario.delay*120;i++)w.step(1/120);simulate(w,p);}return w;};
 const evaluate=extra=>{const outcomes=scenarios.map(s=>{const w=replay(extra,s),hp=w.enemies.reduce((n,e)=>n+(e.alive?Math.max(0,e.hp):0),0),alive=w.enemies.filter(e=>e.alive).length;dispose(w);return {hp,alive};});return {outcomes,won:outcomes.every(o=>!o.alive),score:-Math.max(...outcomes.map(o=>o.hp))*10000-outcomes.reduce((n,o)=>n+o.hp,0)};};
 for(let shot=history.length;shot<buildLevel(level).shots;shot++){
  const baseline=evaluate([]);if(baseline.won)break;let best=null;
  const kind=remaining[1]?'tnt':'cobble';
  for(const candidate of candidates.filter(c=>c.kind===kind&&[1,.875,.75].includes(c.pull)&&[.12,.20,.28,.36,.44,.52,.64,.76,.88,1,1.06].includes(c.angle))){
   if(!remaining[slots[candidate.kind]])continue;const evaluated=evaluate([candidate]);if(!best||evaluated.score>best.score)best={...candidate,...evaluated};if(evaluated.won)break;
  }
  if(!best)break;remaining[slots[best.kind]]--;const {outcomes,won,...record}=best;history.push(record);console.log(JSON.stringify({level:level+1,shot:history.length,kind:best.kind,angle:best.angle,pull:best.pull,won:best.won,worstHp:Math.max(...best.outcomes.map(o=>o.hp))}));
  if(best.won)break;
 }
 const checked=evaluate([]);return {...plan,won:checked.won,loadout:inventoryFor(level),remaining,history,timingChecks:scenarios.map((s,i)=>({...s,...checked.outcomes[i]}))};
}
if(process.argv.includes('--robust')){
 result[requested-1]=robustFinish(requested-1,result[requested-1]);fs.writeFileSync(output,JSON.stringify(result,null,2));if(!result[requested-1].won)process.exitCode=1;
}else{
for(let level=0;level<LEVELS.length;level++){
 if(requested&&level!==requested-1)continue;
 const history=[],remaining=inventoryFor(level),slots={cobble:0,tnt:1,ender:2,fire:3};let current=setup(level);
 const initialHp=current.enemies.reduce((n,e)=>n+e.hp,0),enemyCount=current.enemies.length;
 for(let shot=0;shot<buildLevel(level).shots;shot++){
  const beforeHp=current.enemies.reduce((n,e)=>n+(e.alive?Math.max(0,e.hp):0),0);
  let best=null;
  for(const candidate of candidates){
   if(!remaining[slots[candidate.kind]])continue;
   // Burning is a lane-opening fallback; prefer a shot that already damages a guard.
   if(candidate.kind==='fire'&&best?.hp<beforeHp)continue;
   const w=setup(level);for(const previous of history)simulate(w,previous);simulate(w,candidate);
   const hp=w.enemies.reduce((n,e)=>n+(e.alive?Math.max(0,e.hp):0),0),alive=w.enemies.filter(e=>e.alive).length;
   const score=(enemyCount-alive)*10000+(initialHp-hp)*12+w.stats.removed*.05;
   if(!best||score>best.score)best={...candidate,score,alive,hp,removed:w.stats.removed};
   dispose(w);
  }
  if(!best)break;remaining[slots[best.kind]]--;history.push(best);simulate(current,best);console.log(JSON.stringify({level:level+1,shot:shot+1,...best}));
  if(current.enemies.every(e=>!e.alive))break;
 }
 result[level]={level:level+1,won:current.enemies.every(e=>!e.alive),loadout:inventoryFor(level),remaining,history};
 // The final stage must remain solvable after the player spends time aiming.
 if(level===LEVELS.length-1&&result[level].won)result[level]=robustFinish(level,result[level]);
 fs.writeFileSync(output,JSON.stringify(result,null,2));dispose(current);
}
if(result.some(entry=>entry&&!entry.won))process.exitCode=1;
}
