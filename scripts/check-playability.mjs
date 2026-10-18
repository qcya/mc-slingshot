// Developer-only search. Each candidate replays the complete production Matter world.
// Every recorded shot is a legal launcher drag and spends a real finite ammo slot.
import {createRequire} from 'node:module';import fs from 'node:fs';
import {SiegeWorld} from '../src/world.mjs';import {buildLevel,LEVELS} from '../src/levels.mjs';import {SLING_HOME,pullSling} from '../src/sling.mjs';
import {inventoryFor} from '../src/campaign.mjs';import {updateOutcome} from '../src/outcome.mjs';import {AMMO} from '../src/config.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const candidates=[];
// The desktop CDP pointer stores client coordinates as float32; the canvas starts at y=118.
const inputShot=input=>{const pointer={x:Math.fround(input.x),y:Math.fround(input.y+118)-118};return {input:{...input},pointer,...pullSling(pointer)};};
for(const kind of ['cobble','tnt','ender','fire'].filter(id=>AMMO.some(a=>a.id===id)))for(const power of [1,.875,.75,.625])for(const angle of [.03,.05,.08,.10,.12,.20,.28,.36,.40,.44,.48,.52,.56,.60,.64,.68,.72,.76,.80,.84,.88,.92,.96,1,1.06]){
 const ideal=pullSling({x:SLING_HOME.x-135*power*Math.cos(angle),y:SLING_HOME.y+135*power*Math.sin(angle)}),shot=inputShot(ideal.origin);candidates.push({kind,...shot,angle,pull:power,wait:kind==='fire'?10:6});
}
function setup(level){const s=buildLevel(level),w=new SiegeWorld(M,{grid:s.grid,rear:s.rear});for(const e of s.enemies)w.addEnemy(e.x,e.feet,e.skin,e);w.playability={shots:s.shots,launch:null,quiet:0,winWait:0,outcome:null};return w;}
function advance(w,seconds){for(let i=0;i<120*seconds&&w.playability.outcome===null;i++){
 const state=w.playability;if(state.launch){state.launch.age+=1/120;if(state.launch.age>.5)state.launch=null;}
 w.step(1/120);w.events.length=0;state.outcome=updateOutcome(state,w,1/120);
}}
function simulate(w,shot){if(w.playability.outcome!==null)return w;w.playability.shots--;w.playability.launch={age:0};w.spawnProjectile(shot.kind,shot.origin.x,shot.origin.y,shot.vx,shot.vy);advance(w,shot.wait??6);return w;}
function dispose(w){M.Events.off(w.engine);M.Composite.clear(w.engine.world,false);M.Engine.clear(w.engine);}
const output=process.argv[3]||new URL('../evidence/playability-search.json',import.meta.url),requested=Number(process.argv[2]);
const result=(requested||process.argv.includes('--verify'))&&fs.existsSync(output)?JSON.parse(fs.readFileSync(output)):[];
// Record only verified fixed sequences; moving guards need different aims at
// other times. Lumberyard's old later clears depended on the resting-pearl bug.
const timingScenarios=level=>level===5?[{initial:0,delay:0},{initial:.25,delay:.05}]:level===7?[{initial:0,delay:0},{initial:3,delay:.15}]:level===9?[0,.1,.25,.5,1].flatMap(initial=>[0,.05,.1].map(delay=>({initial,delay}))):[{initial:0,delay:0},{initial:.25,delay:.05},{initial:1,delay:.1},{initial:3,delay:.15}];
function robustFinish(level,plan){
 if(!plan)throw new Error('Robust search requires an existing valid prefix at the output path.');
 const scenarios=timingScenarios(level);
 const history=[...plan.history],reference=(process.argv.includes('--refine-last')||process.argv.includes('--replace-last'))?history.pop():null;
 const localCandidates=reference&&process.argv.includes('--refine-last')?[...([0,-.01,.01,-.1,.1,-.5,.5,-1,1].flatMap(dx=>[0,-.01,.01,-.1,.1,-.5,.5,-1,1].map(dy=>{
  const input={x:reference.input.x+dx,y:reference.input.y+dy},offset={x:SLING_HOME.x-input.x,y:input.y-SLING_HOME.y};
  return {kind:reference.kind,...inputShot(input),angle:Math.atan2(offset.y,offset.x),pull:Math.min(1,Math.hypot(offset.x,offset.y)/135),wait:reference.wait??6,refinement:true};
 }))),...candidates]:candidates;
 const remaining=inventoryFor(level),slots={cobble:0,tnt:1,ender:2,fire:3};for(const p of history)remaining[slots[p.kind]]--;
 const replay=(extra,scenario)=>{const w=setup(level);advance(w,scenario.initial);for(const p of [...history,...extra]){advance(w,scenario.delay);simulate(w,p);}return w;};
 const evaluate=extra=>{const outcomes=scenarios.map(s=>{const w=replay(extra,s),hp=w.enemies.reduce((n,e)=>n+(e.alive?Math.max(0,e.hp):0),0),alive=w.enemies.filter(e=>e.alive).length,removed=w.stats.removed;dispose(w);return {hp,alive,removed};});return {outcomes,won:outcomes.every(o=>!o.alive),score:-Math.max(...outcomes.map(o=>o.hp))*10000-outcomes.reduce((n,o)=>n+o.hp,0)+outcomes.reduce((n,o)=>n+o.removed,0)*.0001};};
 for(let shot=history.length;shot<buildLevel(level).shots;shot++){
  const baseline=evaluate([]);if(baseline.won)break;let best=null;
  for(const candidate of localCandidates.filter(c=>remaining[slots[c.kind]]&&(c.refinement||process.argv.includes('--dense')||([1,.875,.75].includes(c.pull)&&[.12,.20,.28,.36,.44,.52,.64,.76,.88,1,1.06].includes(c.angle))))){
   if(!remaining[slots[candidate.kind]])continue;const evaluated=evaluate([candidate]);if(!best||evaluated.score>best.score)best={...candidate,...evaluated};if(evaluated.won)break;
  }
  if(!best||best.score<=baseline.score)break;remaining[slots[best.kind]]--;const {outcomes,won,...record}=best;history.push(record);console.log(JSON.stringify({level:level+1,shot:history.length,kind:best.kind,angle:best.angle,pull:best.pull,won:best.won,worstHp:Math.max(...best.outcomes.map(o=>o.hp))}));
  if(best.won)break;
 }
 const checked=evaluate([]);return {...plan,won:checked.won,loadout:inventoryFor(level),remaining,history,timingChecks:scenarios.map((s,i)=>({...s,...checked.outcomes[i]}))};
}
if(process.argv.includes('--verify')){
 const timing=[];
 for(const plan of result){
  if(requested&&plan.level!==requested)continue;
  const checks=[];
  for(const scenario of timingScenarios(plan.level-1)){
   const w=setup(plan.level-1),remaining=inventoryFor(plan.level-1),slots={cobble:0,tnt:1,ender:2,fire:3};
   advance(w,scenario.initial);
   for(const shot of plan.history){
    if(w.enemies.every(e=>!e.alive))break;
    if(!remaining[slots[shot.kind]])throw new Error(`Stage ${plan.level} exceeds ${shot.kind} inventory`);
    remaining[slots[shot.kind]]--;advance(w,scenario.delay);simulate(w,shot);
   }
   if(w.enemies.every(e=>!e.alive))advance(w,1.5);
   checks.push({...scenario,outcome:w.playability.outcome,alive:w.enemies.filter(e=>e.alive).length,hp:w.enemies.reduce((sum,e)=>sum+(e.alive?Math.max(0,e.hp):0),0)});dispose(w);
  }
  timing.push({level:plan.level,won:checks.every(c=>c.outcome===true),checks});
  plan.loadout=inventoryFor(plan.level-1);plan.remaining=[...plan.loadout];
  for(const shot of plan.history){const slot={cobble:0,tnt:1,ender:2,fire:3}[shot.kind];if(!plan.remaining[slot])throw new Error(`Stage ${plan.level} exceeds its complete planned inventory`);plan.remaining[slot]--;}
  plan.won=timing.at(-1).won;plan.timingChecks=checks;
  console.log(JSON.stringify(timing.at(-1)));
 }
 fs.writeFileSync(output,JSON.stringify(result,null,2));fs.writeFileSync(new URL('../evidence/playability-timing.json',import.meta.url),JSON.stringify(timing,null,2));if(timing.some(p=>!p.won))process.exitCode=1;
}else if(process.argv.includes('--robust')){
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
