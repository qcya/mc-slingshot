import {DEATH_TOPPLE,DEATH_POOF} from './animation.mjs';

export function updateOutcome(state,world,dt){
 if(world.enemies.every(e=>!e.alive)){
  // Finish the visible loyalty return before pausing the winning round.
  if(world.projectiles?.some(p=>!p.dead&&p.ammo.id==='trident')){state.quiet=0;state.winWait=0;return null;}
  // Death animation belongs to a won round; the loss timer cannot run here.
  state.quiet=0;state.winWait+=dt;return state.winWait>DEATH_TOPPLE+DEATH_POOF+.1?true:null;
 }
 state.winWait=0;
 if(state.shots===0&&!state.launch&&!world.active()){
  state.quiet+=dt;if(state.quiet>2)return false;
 }else state.quiet=0;
 return null;
}
