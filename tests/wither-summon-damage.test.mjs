import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {PixelGrid} from '../src/pixels.mjs';
import {damageEnemy,projectileDamage} from '../src/combat.mjs';
import {burnEnemy} from '../src/fire.mjs';
import {updateOutcome} from '../src/outcome.mjs';

const M=createRequire(import.meta.url)('../vendor/matter.min.js');
function fixture(){
 const grid=new PixelGrid(512,288);grid.fill(0,224,512,64,7);
 const w=new SiegeWorld(M,{grid}),boss=w.addEnemy(900,440,'wither');
 w.step(1/120);return {w,boss};
}
const adds=w=>w.enemies.filter(e=>e.skin==='wither_skeleton');

test('three distinct projectile attacks remove exactly one Wither health chunk each despite different weapon damage',()=>{
 const {w,boss}=fixture();
 for(const [index,kind]of ['ender','cobble','anvil'].entries()){
  const p=w.spawnProjectile(kind,200,200,600,0);
  assert.equal(projectileDamage(w,boss,p,600),true);
  assert.equal(boss.hp,450-(index+1)*150);
  assert.equal(adds(w).length,index+1,'each accepted attack synchronously summons exactly one skeleton');
  assert.equal(boss.alive,index<2);
  projectileDamage(w,boss,p,600);
  assert.equal(boss.hp,450-(index+1)*150);assert.equal(adds(w).length,index+1);
 }
 assert.equal(w.events.filter(e=>e.type==='summon').length,3);
 assert.equal(w.stats.enemyDamage,450);
});

test('one effective source is deduplicated across repeated damage calls while a new source adds a chunk',()=>{
 const {w,boss}=fixture();boss.encounterPhase='recover';
 assert.equal(damageEnemy(w,boss,10000,{source:'shared:1',kind:'tnt'}),true);
 for(const amount of [3,75,150,9999])assert.equal(damageEnemy(w,boss,amount,{source:'shared:1',kind:'anvil'}),false);
 assert.equal(boss.hp,300);assert.equal(adds(w).length,1);
 damageEnemy(w,boss,3,{source:'distinct:2',kind:'ender'});
 assert.equal(boss.hp,150);assert.equal(adds(w).length,2);
});

test('all three hit summons, including the lethal hit, occupy clear supported distinct ground',()=>{
 const {w,boss}=fixture();
 for(let i=0;i<3;i++)damageEnemy(w,boss,100,{source:`attack:${i}`,kind:'cobble'});
 const skeletons=adds(w);assert.equal(skeletons.length,3);assert.equal(boss.alive,false);
 for(const [i,add]of skeletons.entries()){
  assert.equal(add.alive,true);
  const b=add.body.bounds;
  for(let x=b.min.x+2;x<b.max.x-2;x+=3)assert.ok(w.sample(x,b.max.y+1),'summon feet have real terrain support');
  for(let y=b.min.y+2;y<b.max.y-2;y+=3)for(let x=b.min.x+2;x<b.max.x-2;x+=3)assert.equal(w.sample(x,y),0);
  for(const other of skeletons.slice(i+1)){
   const c=other.body.bounds;
   assert.ok(b.max.x<=c.min.x||b.min.x>=c.max.x||b.max.y<=c.min.y||b.min.y>=c.max.y);
  }
 }
 for(let i=0;i<120;i++)w.step(1/120);
 assert.equal(skeletons.every(e=>e.alive),true,'summons survive their first second on real Matter ground');
});

test('the third Wither hit cannot win the round until its summoned skeletons are defeated',()=>{
 const {w,boss}=fixture(),state={shots:1,launch:null,quiet:0,winWait:0};
 for(let i=0;i<3;i++)damageEnemy(w,boss,150,{source:`attack:${i}`,kind:'anvil'});
 assert.equal(boss.alive,false);assert.equal(adds(w).length,3);
 for(let i=0;i<360;i++)assert.equal(updateOutcome(state,w,1/120),null);
 assert.equal(state.winWait,0);
 for(const [i,add]of adds(w).entries())damageEnemy(w,add,250,{source:`cleanup:${i}`,kind:'cobble'});
 let result=null;for(let i=0;i<600&&result===null;i++)result=updateOutcome(state,w,1/120);
 assert.equal(result,true);
});

test('immune fire and lava, zero damage, and invalid damage do not consume a chunk or summon',()=>{
 const {w,boss}=fixture();
 assert.equal(burnEnemy(w,boss,'charge:1'),false);
 for(const kind of ['fire','lava'])assert.equal(damageEnemy(w,boss,999,{source:`immune:${kind}`,kind}),false);
 for(const value of [0,-1,NaN,Infinity])assert.equal(damageEnemy(w,boss,value,{source:'invalid',kind:'cobble'}),false);
 assert.equal(boss.hp,450);assert.equal(adds(w).length,0);assert.equal(boss.hitSources.size,0);
 assert.equal(boss.burnTicks.length,0);
 assert.equal(damageEnemy(w,boss,75,{source:'valid',kind:'ender'}),true);
 assert.equal(boss.hp,300);assert.equal(adds(w).length,1);
});
