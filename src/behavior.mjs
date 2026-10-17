// Deterministic per-actor timing keeps tests reproducible without synchronizing mobs.
export function actorState(id,time){return {behavior:'walk',actionUntil:time+2.4+id*.13,idleCount:0,walkBlend:1,pose:{walkBlend:1,headYaw:0,headPitch:0,gesture:0},externalUntil:0};}
export function animateActor(e,time,dt,walkingAllowed){
 if(time>=e.actionUntil){
  if(e.behavior==='walk'){e.behavior='idle';e.idleCount++;e.actionStart=time;e.actionUntil=time+.9+(e.id%3)*.2;}
  else{e.behavior='walk';e.actionUntil=time+1.9+((e.id+e.idleCount)%4)*.35;}
 }
 const walking=e.behavior==='walk'&&walkingAllowed;
 e.walkBlend+=(Number(walking)-e.walkBlend)*Math.min(1,dt*9);
 const t=time-(e.actionStart||time),envelope=e.behavior==='idle'?Math.sin(Math.min(1,t/(e.actionUntil-e.actionStart))*Math.PI):0;
 e.pose={walkBlend:e.walkBlend,headYaw:envelope*Math.sin(t*4.2+e.id)*.32,headPitch:envelope*Math.sin(t*3)*.2,
  gesture:e.idleCount%2===0?envelope*(.8+.2*Math.sin(t*7)):0};
 return walking;
}
