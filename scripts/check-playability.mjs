// Developer-only search: every candidate uses the complete production Matter world.
// This does not run in the game or create scripted destruction.
import {createRequire} from 'node:module';import fs from 'node:fs';
import {SiegeWorld} from '../src/world.mjs';import {buildLevel} from '../src/levels.mjs';import {SLING_HOME,pullSling} from '../src/sling.mjs';
import {inventoryFor} from '../src/campaign.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const candidates=[];
for(const kind of ['tnt','ender','cobble'])for(const power of [1,.75])for(const angle of [.12,.20,.28,.36,.40,.44,.48,.52,.56,.60,.64,.68,.72,.76,.80,.84,.88,.92,.96,1,1.06]){
 const shot=pullSling({x:SLING_HOME.x-135*power*Math.cos(angle),y:SLING_HOME.y+135*power*Math.sin(angle)});candidates.push({kind,...shot,angle,pull:power});
}
function setup(level){const s=buildLevel(level),w=new SiegeWorld(M,{grid:s.grid,rear:s.rear});for(const e of s.enemies)w.addEnemy(e.x,e.feet,e.skin);return w;}
function simulate(w,shot){w.spawnProjectile(shot.kind,shot.origin.x,shot.origin.y,shot.vx,shot.vy);for(let i=0;i<720;i++){w.step(1/120);w.events.length=0;if(w.enemies.every(e=>!e.alive))break;}return w;}
const requested=Number(process.argv[2]),result=requested?JSON.parse(fs.readFileSync('evidence/playability-search.json')):[];
for(let level=0;level<5;level++){
 if(requested&&level!==requested-1)continue;
 const history=[],remaining=inventoryFor(level),slots={cobble:0,tnt:1,ender:2};let current=setup(level);
 for(let shot=0;shot<buildLevel(level).shots;shot++){
  let best=null;
  for(const candidate of candidates){
   if(!remaining[slots[candidate.kind]])continue;
   const w=setup(level);for(const previous of history)simulate(w,previous);simulate(w,candidate);
   const hp=w.enemies.reduce((n,e)=>n+(e.alive?Math.max(0,e.hp):0),0),alive=w.enemies.filter(e=>e.alive).length;
   const score=(buildLevel(level).enemies.length-alive)*10000+(buildLevel(level).enemies.length*100-hp)*12+w.stats.removed*.05+w.debris.length*5;
   if(!best||score>best.score)best={...candidate,score,alive,hp,removed:w.stats.removed};
   M.Events.off(w.engine);M.Composite.clear(w.engine.world,false);M.Engine.clear(w.engine);
  }
  if(!best)break;remaining[slots[best.kind]]--;history.push(best);simulate(current,best);console.log(JSON.stringify({level:level+1,shot:shot+1,...best}));
  if(current.enemies.every(e=>!e.alive))break;
 }
 result[level]={level:level+1,won:current.enemies.every(e=>!e.alive),history};fs.writeFileSync('evidence/playability-search.json',JSON.stringify(result,null,2));
}
