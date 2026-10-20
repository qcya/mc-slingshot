import test from 'node:test';import assert from 'node:assert/strict';
import * as sling from '../src/sling.mjs';
function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
test('pocket straps cradle a loaded cube instead of crossing its face at rest and every full pull direction',()=>{
 assert.equal(typeof sling.pocketGeometry,'function');
 for(const point of [sling.SLING_HOME,...Array.from({length:24},(_,i)=>sling.pullSling({x:285+135*Math.cos(i*Math.PI/12),y:545+135*Math.sin(i*Math.PI/12)}).origin)]){
  const g=sling.pocketGeometry(point,28);
  for(const [anchor,end]of [[sling.SLING_FRAME.left,g.left],[sling.SLING_FRAME.right,g.right]])assert.ok(distanceToSegment(point,anchor,end)>=Math.SQRT2*14,JSON.stringify(point));
  assert.ok(Math.hypot(g.left.x-g.right.x,g.left.y-g.right.y)>25);
 }
 for(const point of [sling.SLING_FRAME.left,sling.SLING_FRAME.right,{x:285,y:516}]){
  const g=sling.pocketGeometry(point,28);
  for(const p of [g.left,g.right,g.localLeft,g.localRight])assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y),'crossing a fork tip cannot create NaN geometry');
  assert.ok(Number.isFinite(g.angle));
 }
});
