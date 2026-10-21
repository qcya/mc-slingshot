// Developer-only solver: no runtime shortcuts, every shot spends level supply.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {buildLevel} from '../src/levels.mjs';
import {SiegeWorld} from '../src/world.mjs';
import {inventoryFor} from '../src/campaign.mjs';
import {AMMO} from '../src/config.mjs';
import {SLING_HOME,pullSling} from '../src/sling.mjs';
import {updateOutcome} from '../src/outcome.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const file=new URL('../evidence/sift-playability.json',import.meta.url),result=[];
const candidates=[];
for(const kind of ['trident','cobble','tnt','ender','anvil','slimeball'])for(const pull of [1,.875,.75])for(const angle of [.04,.10,.16,.22,.28,.34,.40,.46,.52,.58,.64,.70,.76,.82,.88,.94,1,1.06]){
 const ideal=pullSling({x:SLING_HOME.x-135*pull*Math.cos(angle),y:SLING_HOME.y+135*pull*Math.sin(angle)});
 const input={...ideal.origin},pointer={x:Math.fround(input.x),y:Math.fround(input.y+70)-70};
 candidates.push({kind,input,pointer,...pullSling(pointer),angle,pull,wait:kind==='tnt'?6:4});
}
function setup(level,history){
 const scene=buildLevel(level,'sift'),w=new SiegeWorld(M,scene),bag=inventoryFor(level,'sift');
 for(const e of scene.enemies)w.addEnemy(e.x,e.feet,e.skin,e);
 const state={shots:bag.reduce((a,b)=>a+b,0),launch:null,quiet:0,winWait:0};let outcome=null;
 const advance=seconds=>{for(let i=0;i<seconds*120&&outcome===null;i++){if(state.launch&&(state.launch.age+=1/120)>.5)state.launch=null;w.step(1/120);w.events.length=0;outcome=updateOutcome(state,w,1/120);}};
 const fire=move=>{const slot=AMMO.findIndex(a=>a.id===move.kind);if(!bag[slot])throw Error('Invalid supply');bag[slot]--;state.shots--;state.launch={age:0};w.spawnProjectile(move.kind,move.origin.x,move.origin.y,move.vx,move.vy);advance(move.wait);};
 for(const shot of history){if(outcome!==null)break;fire(shot);}
 return {w,bag,fire,advance,get outcome(){return outcome;},dispose(){M.Events.off(w.engine);M.Composite.clear(w.engine.world,false);M.Engine.clear(w.engine);}};
}
for(let level=0;level<10;level++){
 const history=[];let won=false;
 for(let i=0;i<24;i++){
  const baseline=setup(level,history),before=baseline.w.enemies.reduce((n,e)=>n+Math.max(0,e.hp),0);
  if(baseline.w.enemies.every(e=>!e.alive)){baseline.advance(2);won=baseline.outcome===true;baseline.dispose();break;}
  const bag=baseline.bag;baseline.dispose();let best=null;
  for(const move of candidates){
   if(!bag[AMMO.findIndex(a=>a.id===move.kind)])continue;
   const s=setup(level,history);s.fire(move);
   const hp=s.w.enemies.reduce((n,e)=>n+Math.max(0,e.hp),0),score=(before-hp)*10000+s.w.stats.removed*.01;
   if(!best||score>best.score)best={move,score,hp};s.dispose();if(hp===0)break;
  }
  if(!best||best.score<=0)break;history.push(best.move);
  console.log(JSON.stringify({level:level+1,shot:history.length,kind:best.move.kind,hp:best.hp}));
 }
 result.push({level:level+1,won,loadout:inventoryFor(level,'sift'),history});fs.writeFileSync(file,JSON.stringify(result,null,2));
 if(!won){console.error('No complete route for Sift '+(level+1));process.exitCode=1;}
}
