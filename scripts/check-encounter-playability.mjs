import fs from 'node:fs';
import {createRequire} from 'node:module';
import {buildLevel} from '../src/levels.mjs';
import {SiegeWorld} from '../src/world.mjs';
import {inventoryFor,spendAmmo,totalAmmo} from '../src/campaign.mjs';
import {AMMO} from '../src/config.mjs';
import {SLING_HOME,pullSling} from '../src/sling.mjs';
import {updateOutcome} from '../src/outcome.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const dimension=process.argv[2]||'sift',requested=(process.argv[3]||'').split(',').map(Number).filter(n=>n>0),verify=process.argv.includes('--verify');
const file=new URL(`../evidence/${dimension}-playability.json`,import.meta.url);
const result=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[];
const candidates=[];
for(const kind of ['lava_bucket','trident','cobble','tnt','ender','slimeball'])for(const pull of [1,.875,.75])for(const angle of [.02,.06,.10,.14,.18,.22,.26,.30,.34,.38,.42,.46,.50,.54,.58,.62,.66,.70,.74,.78,.82,.86,.90,.94,.98,1.02,1.06]){
 const ideal=pullSling({x:SLING_HOME.x-135*pull*Math.cos(angle),y:SLING_HOME.y+135*pull*Math.sin(angle)});
 const input={...ideal.origin},top=dimension==='sift'?70:118,pointer={x:Math.fround(input.x),y:Math.fround(input.y+top)-top};
 candidates.push({kind,input,pointer,...pullSling(pointer),angle,pull,wait:kind==='lava_bucket'?12:['tnt','trident'].includes(kind)?6:4});
}
function setup(level,history){
 const scene=buildLevel(level,dimension),w=new SiegeWorld(M,scene),bag=inventoryFor(level,dimension);
 for(const e of scene.enemies)w.addEnemy(e.x,e.feet,e.skin,e);
 const state={shots:totalAmmo(bag),launch:null,quiet:0,winWait:0};let outcome=null;
 const advance=seconds=>{for(let i=0;i<seconds*120&&outcome===null;i++){if(state.launch&&(state.launch.age+=1/120)>.5)state.launch=null;w.step(1/120);w.events.length=0;outcome=updateOutcome(state,w,1/120);}};
 const fire=move=>{if(outcome!==null)return;const slot=AMMO.findIndex(a=>a.id===move.kind);if(!spendAmmo(bag,slot))throw Error(`Invalid ${move.kind} supply`);if(move.kind==='trident'&&w.projectiles.some(p=>p.ammo.id==='trident'&&!p.dead))throw Error('Trident still returning');state.shots=totalAmmo(bag);state.launch={age:0};w.spawnProjectile(move.kind,move.origin.x,move.origin.y,move.vx,move.vy,{returnHome:SLING_HOME});advance(move.wait);};
 for(const shot of history){if(outcome!==null||w.enemies.every(e=>!e.alive))break;fire(shot);}
 return {w,bag,fire,advance,get outcome(){return outcome;},get hp(){return w.enemies.reduce((n,e)=>n+(e.alive?Math.max(0,e.hp):0),0);},dispose(){M.Events.off(w.engine);M.Composite.clear(w.engine.world,false);M.Engine.clear(w.engine);}};
}
for(let level=0;level<10;level++){
 if(requested.length&&!requested.includes(level+1))continue;
 if(verify){const s=setup(level,result[level]?.history||[]);s.advance(2);console.log(JSON.stringify({dimension,level:level+1,won:s.outcome===true,hp:s.hp,alive:s.w.enemies.filter(e=>e.alive).map(e=>({skin:e.skin,hp:e.hp,x:e.body.position.x,y:e.body.position.y}))}));if(s.outcome!==true)process.exitCode=1;s.dispose();continue;}
 const history=process.argv.includes('--extend')?[...(result[level]?.history||[])]:[];let won=false;
 for(let i=history.length;i<buildLevel(level,dimension).shots;i++){
  const baseline=setup(level,history),before=baseline.hp,beforeCrystals=baseline.w.projectiles.filter(p=>!p.dead&&p.healingOwner).length;
  if(baseline.w.enemies.every(e=>!e.alive)){baseline.advance(2);won=baseline.outcome===true;baseline.dispose();break;}
  const bag=baseline.bag;baseline.dispose();let best=null;
  for(const move of candidates){
   if(!bag[AMMO.findIndex(a=>a.id===move.kind)])continue;
   const s=setup(level,history);s.fire(move);
   const hp=s.hp,alive=s.w.enemies.filter(e=>e.alive).length,crystals=s.w.projectiles.filter(p=>!p.dead&&p.healingOwner).length,score=(before-hp)*10000+(beforeCrystals-crystals)*1200000+s.w.stats.removed*.01;
   if(!best||score>best.score)best={move,score,hp,alive};s.dispose();if(hp===0)break;
  }
  if(!best||best.score<=0)break;history.push(best.move);
  console.log(JSON.stringify({dimension,level:level+1,shot:history.length,kind:best.move.kind,hp:best.hp,angle:best.move.angle,pull:best.move.pull}));
  if(best.hp===0){const s=setup(level,history);s.advance(2);won=s.outcome===true;s.dispose();break;}
 }
 // Include the solver's final settling allowance in the recorded legal wait.
 // Browser and canonical replay then need no special extra physics allowance.
 if(won&&history.length)history.at(-1).wait+=2;
 result[level]={world:dimension,level:level+1,won,loadout:inventoryFor(level,dimension),history};fs.writeFileSync(file,JSON.stringify(result,null,2));
 if(!won){console.error(`No complete route for ${dimension} ${level+1}`);process.exitCode=1;}
}
