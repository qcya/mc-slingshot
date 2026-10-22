import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {PixelGrid} from '../src/pixels.mjs';
import {RearLayer} from '../src/rear.mjs';

const M=createRequire(import.meta.url)('../vendor/matter.min.js'),DT=1/120;
function makeWorld(){return new SiegeWorld(M,{grid:new PixelGrid(320,240),rear:new RearLayer(320,240)});}
function advance(w,seconds){for(let i=0;i<Math.ceil(seconds/DT);i++)w.step(DT);}
function until(w,predicate,seconds){for(let i=0;i<Math.ceil(seconds/DT)&&!predicate();i++)w.step(DT);assert.ok(predicate(),'physical event did not occur within allotted simulation');}
const count=(cells,m)=>cells.reduce((n,value)=>n+(value===m),0);
function actualTnt(w,x,y){const t=w.spawnProjectile('tnt',x,y,0,0);t.fuse=.01;advance(w,.025);assert.equal(t.dead,true);}

test('outbound trident physically stops at stone without a hole, then returns without terrain or rear damage',()=>{
 const w=makeWorld();w.grid.fill(100,0,16,128,3);w.grid.fill(0,128,320,16,7);w.rear.grid.fill(100,0,16,128,3);w.synchronize();
 const foreground=w.grid.cells.slice(),hp=w.grid.hp.slice(),rear=w.rear.grid.cells.slice(),rearHp=w.rear.grid.hp.slice(),p=w.spawnProjectile('trident',150,330,900,0);
 let contacted=false,maxOutboundX=150;
 until(w,()=>p.returned,5);
 // A new independent throw records the actual outbound collision boundary.
 const q=w.spawnProjectile('trident',150,330,900,0);
 for(let i=0;i<600&&!q.returning;i++){w.step(DT);maxOutboundX=Math.max(maxOutboundX,q.body.position.x);contacted||=w.contacts.some(pair=>pair.bodyA.parent.plugin.terrain||pair.bodyB.parent.plugin.terrain);}
 assert.ok(contacted,'must test a real Matter terrain collision');
 assert.ok(maxOutboundX<=300-q.ammo.size/2+3,'stone wall must physically stop outbound flight');
 until(w,()=>q.returned,5);assert.equal(q.dead,true);
 assert.deepEqual(w.grid.cells,foreground,'trident must not remove stone');assert.deepEqual(w.grid.hp,hp,'trident must not weaken stone');
 assert.deepEqual(w.rear.grid.cells,rear);assert.deepEqual(w.rear.grid.hp,rearHp);
});

test('trident shatters a glass wall and still hits a real monster beyond it',()=>{
 const w=makeWorld();w.engine.gravity.y=0;w.grid.fill(100,0,16,128,6);w.grid.fill(0,128,320,16,7);w.synchronize();
 const target=w.addEnemy(450,384,'zombie',{stationary:true});M.Body.setStatic(target.body,true);
 const initial=count(w.grid.cells,6),p=w.spawnProjectile('trident',150,338,900,0);
 until(w,()=>!target.alive,2);
 assert.ok(count(w.grid.cells,6)<initial,'glass must break on the outbound path');
 assert.ok(target.hitSources.has(`ammo:${p.id}:outbound`),'monster beyond the wall must be hit by this outbound trident');
 assert.ok(w.events.some(e=>e.sound==='glass'),'glass break keeps its native impact cue');
});

test('trident breaks the glass half of a mixed terrain body while its stone half physically stops it',()=>{
 const w=makeWorld();w.engine.gravity.y=0;w.grid.fill(96,96,8,16,6);w.grid.fill(104,96,8,16,3);w.synchronize();
 const stones=count(w.grid.cells,3),stoneHp=w.grid.hp[100*w.grid.width+108],p=w.spawnProjectile('trident',150,312,900,0);
 advance(w,1);
 assert.equal(count(w.grid.cells,6),0,'glass in a mixed parent body must still shatter');
 assert.equal(count(w.grid.cells,3),stones);assert.equal(w.grid.hp[100*w.grid.width+108],stoneHp);
 assert.ok(p.returning||p.returned,'the stone half must stop the outbound leg');
 assert.ok(p.body.position.x<312-p.ammo.size/2+3,'the stone half remains a real physical barrier');
});

test('trident passes glass debris to hit a monster without damaging its adjoining wooden frame',()=>{
 const w=makeWorld();w.engine.gravity.y=0;const mask=new Uint8Array(16*32).fill(6);mask.fill(4,0,16*6);
 const debris=w.addDebris(mask,16,32,{x:288,y:264}),wood=count(mask,4),woodHp=debris.hp[0];M.Body.setStatic(debris.body,true);
 const target=w.addEnemy(450,370,'zombie',{stationary:true});M.Body.setStatic(target.body,true);
 const p=w.spawnProjectile('trident',150,324,900,0);until(w,()=>!target.alive,2);
 assert.ok(target.hitSources.has(`ammo:${p.id}:outbound`));
 const live=w.debris.filter(e=>!e.dead);assert.ok(live.reduce((n,e)=>n+count(e.mask,6),0)<16*26,'glass debris must be cut along the actual projectile path');
 assert.equal(live.reduce((n,e)=>n+count(e.mask,4),0),wood,'wood frame must retain every original pixel');
 for(const e of live)for(let k=0;k<e.mask.length;k++)if(e.mask[k]===4)assert.equal(e.hp[k],woodHp,'wood frame must not receive hidden damage');
});

test('actual TNT cannot cut or weaken static obsidian, exposed rear obsidian, or obsidian debris',()=>{
 const w=makeWorld();w.engine.gravity.y=0;w.grid.fill(110,70,12,20,40);w.rear.grid.fill(85,70,12,20,40);w.synchronize();
 const debris=w.addDebris(new Uint8Array(12*12).fill(40),12,12,{x:282,y:270});M.Body.setStatic(debris.body,true);
 const front=count(w.grid.cells,40),rear=count(w.rear.grid.cells,40),debrisCount=debris.count;
 for(let i=0;i<4;i++)actualTnt(w,300,240);
 assert.equal(w.stats.explosions,4);
 assert.equal(count(w.grid.cells,40),front,'static obsidian survives repeated actual TNT');
 assert.equal(count(w.rear.grid.cells,40),rear,'exposed rear obsidian survives repeated actual TNT');
 assert.equal(debris.dead,undefined);assert.equal(debris.count,debrisCount);assert.equal(count(debris.mask,40),debrisCount);
 assert.ok(w.grid.hp.every((hp,i)=>w.grid.cells[i]!==40||hp===Infinity),'front obsidian retains infinite hardness');
 assert.ok(w.rear.grid.hp.every((hp,i)=>w.rear.grid.cells[i]!==40||hp===Infinity),'rear obsidian retains infinite hardness');
 assert.ok(debris.hp.every(hp=>hp===Infinity),'obsidian debris retains infinite hardness');
});

test('TNT cannot discard a tiny obsidian fragment after destroying its surrounding wood debris',()=>{
 const w=makeWorld();w.engine.gravity.y=0;
 const mask=new Uint8Array(12*8).fill(4);mask[0]=40;
 const d=w.addDebris(mask,12,8,{x:282,y:222});M.Body.setStatic(d.body,true);
 actualTnt(w,300,240);
 assert.ok(count(d.mask,4)<95,'the real blast must remove the destructible surrounding wood');
 assert.equal(w.debris.filter(e=>!e.dead).reduce((n,e)=>n+count(e.mask,40),0),1,'a one-pixel indestructible component must survive debris splitting');
});

test('stone impact and a physically triggered End Crystal preserve obsidian and its exposed rear layer',()=>{
 for(const weapon of ['cobble','crystal']){
  const w=makeWorld();w.grid.fill(80,128,100,12,40);w.rear.grid.fill(100,112,20,12,40);w.synchronize();
  const front=count(w.grid.cells,40),rear=count(w.rear.grid.cells,40);
  if(weapon==='cobble'){
   w.spawnProjectile('cobble',330,220,0,1200);advance(w,.5);
   assert.ok(w.events.some(e=>e.type==='impact'),'stone must physically impact the obsidian');
  }else{
   const c=w.spawnProjectile('crystal',330,330,0,0);until(w,()=>c.placed,2);w.engine.gravity.y=0;
   w.spawnProjectile('cobble',150,356,900,0);until(w,()=>c.dead,1);assert.equal(w.stats.explosions,1,'a real stone hit must detonate the crystal');
  }
  assert.equal(count(w.grid.cells,40),front,weapon+' must preserve foreground obsidian');
  assert.equal(count(w.rear.grid.cells,40),rear,weapon+' must preserve exposed rear obsidian');
  assert.ok(w.grid.hp.every((hp,i)=>w.grid.cells[i]!==40||hp===Infinity));
  assert.ok(w.rear.grid.hp.every((hp,i)=>w.rear.grid.cells[i]!==40||hp===Infinity));
 }
});

test('anvil crushes thin overburden, stops on obsidian, and never deletes the destructible layer beneath',()=>{
 const w=makeWorld(),x=300,plateY=360;w.grid.fill(60,108,80,12,3);w.grid.fill(60,120,80,6,40);w.grid.fill(60,126,80,54,3);w.grid.fill(0,180,320,16,7);w.synchronize();
 const protectedLayer=[];for(let gy=126;gy<180;gy++)for(let gx=60;gx<140;gx++)protectedLayer.push([gx,gy,w.grid.get(gx,gy)]);
 const obsidian=count(w.grid.cells,40),p=w.spawnProjectile('anvil',x,180,0,350);
 until(w,()=>p.planted,7);
 assert.ok(w.stats.removed>0,'anvil must crush the actual stone overburden');
 assert.ok(Math.abs(p.body.bounds.max.y-plateY)<1,'anvil must rest at the first obsidian top surface');
 assert.equal(count(w.grid.cells,40),obsidian);
 for(const[gx,gy,m]of protectedLayer)assert.equal(w.grid.get(gx,gy),m,`below-obsidian layer changed at ${gx},${gy}`);
 advance(w,1);assert.equal(p.dead,true,'indestructible impact uses the normal stop/fade lifecycle');
});

test('anvil also stops at a real obsidian debris platform before reaching stone beneath it',()=>{
 const w=makeWorld();w.grid.fill(60,108,80,12,3);w.grid.fill(60,126,80,54,3);w.grid.fill(0,180,320,16,7);w.synchronize();
 const platform=w.addDebris(new Uint8Array(80*6).fill(40),80,6,{x:180,y:360});M.Body.setStatic(platform.body,true);
 const p=w.spawnProjectile('anvil',300,180,0,350);until(w,()=>p.planted,7);
 assert.ok(w.stats.removed>0,'must crush actual grid overburden before encountering the debris platform');
 assert.ok(Math.abs(p.body.bounds.max.y-360)<1,'first sampled indestructible debris surface stops the anvil');
 assert.equal(platform.dead,undefined);assert.equal(count(platform.mask,40),80*6);assert.ok(platform.hp.every(v=>v===Infinity));
 for(let y=126;y<180;y++)for(let x=60;x<140;x++)assert.equal(w.grid.get(x,y),3,'stone beneath obsidian debris must remain intact');
});
