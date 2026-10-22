import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {PixelGrid} from '../src/pixels.mjs';
import {pullSling,SLING_HOME} from '../src/sling.mjs';
import {launchVelocity} from '../src/weapons.mjs';
const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function actualGroundRange(angle,old=false){
 const launch=pullSling({x:SLING_HOME.x-135*Math.cos(angle),y:SLING_HOME.y+135*Math.sin(angle)});
 const w=new SiegeWorld(M,{grid:new PixelGrid(1800,600)}),p=w.spawnProjectile('anvil',launch.origin.x,launch.origin.y,launch.vx,launch.vy);
 if(old){p.ammo={...p.ammo,rangeScale:.82,liftScale:.62,gravityScale:2.8};M.Body.setVelocity(p.body,launchVelocity(p.ammo,launch.vx,launch.vy));}
 for(let i=0;i<1200;i++){
  w.step(1/120);
  if(p.body.position.y+p.ammo.size/2>=672&&p.body.velocity.y>0)return p.body.position.x-launch.origin.x;
 }
 assert.fail('anvil did not reach the ordinary ground height');
}
test('the heavy natural anvil arc travels three to four times the measured beta3 range',()=>{
 const measured=[388.14791131791935,395.4532662735446,380.5165554111769,310.55542418718755];
 for(const [i,angle]of [.4,.6,.8,1].entries()){
  const baseline=actualGroundRange(angle,true),current=actualGroundRange(angle);
  assert.ok(Math.abs(baseline-measured[i])<.01,'the measured beta3 baseline remains reproducible');
  assert.ok(current/baseline>=3&&current/baseline<=4,`angle ${angle}: ${current.toFixed(2)}/${baseline.toFixed(2)} = ${(current/baseline).toFixed(3)}`);
 }
});
