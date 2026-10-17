// Integral of a steadily increasing flash frequency (2 -> 9.2 Hz in 4 s).
export function tntFlash(fuse){const age=Math.max(0,Math.min(4,4-fuse));return (age*2+.9*age*age)%1<.5;}
export const DEATH_TOPPLE=.65, DEATH_POOF=.5;
export function mobAppearance(e,time){
 const age=e.alive?0:Math.max(0,time-e.deathAt),t=Math.min(1,age/.5);
 return {hurt:time<(e.hurtUntil??-1),angle:e.alive?0:(e.facing||1)*Math.PI/2*(1-(1-t)**3),visible:e.alive||age<DEATH_TOPPLE};
}
