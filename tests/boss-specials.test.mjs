import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SiegeWorld} from '../src/world.mjs';
import {PixelGrid} from '../src/pixels.mjs';
import {gust} from '../src/combat.mjs';
import {buildEnd} from '../src/levels-end.mjs';
import {updateOutcome} from '../src/outcome.mjs';

const M=createRequire(import.meta.url)('../vendor/matter.min.js');
const DT=1/120;
function advance(w,seconds){for(let i=0;i<Math.ceil(seconds/DT);i++)w.step(DT);}
function until(w,predicate,seconds=12){
 for(let i=0;i<Math.ceil(seconds/DT)&&!predicate();i++)w.step(DT);
 assert.ok(predicate(),'expected encounter state was not reached');
}
function dragonWorld(){
 const scene=buildEnd(9),w=new SiegeWorld(M,scene);
 for(const actor of scene.enemies)w.addEnemy(actor.x,actor.feet,actor.skin,actor);
 return {w,dragon:w.enemies.find(e=>e.skin==='ender_dragon')};
}
function healingCrystals(w,dragon){return w.projectiles.filter(p=>!p.dead&&p.healingOwner===dragon.id);}
function golemWorld(){
 const grid=new PixelGrid(512,288);grid.fill(0,224,512,64,7);
 const w=new SiegeWorld(M,{grid}),golem=w.addEnemy(900,672,'sift_echo_golem');
 return {w,golem};
}
function shieldReady(w,golem){until(w,()=>golem.echoShieldActive);}
function approaching(w,golem,kind='cobble',side=-1){
 return w.spawnProjectile(kind,golem.body.position.x+side*110,golem.body.position.y,-side*900,0);
}

test('the authored Dragon fight creates exactly two real placed healing crystals without a player throw',()=>{
 const {w,dragon}=dragonWorld(),crystals=healingCrystals(w,dragon);
 assert.equal(crystals.length,2);assert.equal(w.projectiles.length,2);
 for(const p of crystals){
  assert.equal(p.ammo.id,'crystal');assert.equal(p.placed,true);assert.equal(p.body.isStatic,true);
  assert.equal(p.fuse,Infinity);assert.ok(M.Composite.allBodies(w.engine.world).includes(p.body));
  assert.ok(w.sample(p.body.position.x,p.body.position.y+p.ammo.size/2+2));
 }
 assert.equal(w.stats.explosions,0);assert.equal(w.stats.enemyDamage,0);
});

test('two living crystals heal the Dragon at twelve HP per second and cap at its full health',()=>{
 const {w,dragon}=dragonWorld();dragon.hp=400;
 advance(w,.5);assert.ok(Math.abs(dragon.hp-406)<.01);
 dragon.hp=599;advance(w,1);assert.equal(dragon.hp,600);
 assert.equal(healingCrystals(w,dragon).length,2);
});

test('destroying each Dragon crystal immediately removes its own healing contribution',()=>{
 const {w,dragon}=dragonWorld(),[first,second]=healingCrystals(w,dragon);
 assert.ok(first&&second);dragon.hp=350;
 gust(w,first.body.position.x,first.body.position.y);
 assert.equal(first.dead,true);assert.equal(second.dead,undefined);
 const hp=dragon.hp;advance(w,.5);assert.ok(Math.abs(dragon.hp-hp-3)<.01);
 gust(w,second.body.position.x,second.body.position.y);
 assert.equal(second.dead,true);
 const stopped=dragon.hp;advance(w,1);assert.equal(dragon.hp,stopped);
});

test('a real fast projectile destroys an authored Dragon crystal through ordinary crystal collision',()=>{
 const {w,dragon}=dragonWorld(),crystal=healingCrystals(w,dragon)[0];assert.ok(crystal);
 w.engine.gravity.y=0;
 const p=crystal.body.position;
 w.spawnProjectile('cobble',p.x-80,p.y-12,900,0);
 until(w,()=>crystal.dead,1);
 assert.ok(w.stats.explosions>=1);assert.equal(healingCrystals(w,dragon).length,1);
});

test('ordinary player crystals do not heal the Dragon and healing never resurrects a dead Dragon',()=>{
 const {w,dragon}=dragonWorld();
 for(const p of healingCrystals(w,dragon))w.remove(p);
 const playerCrystal=w.spawnProjectile('crystal',400,600,0,0);
 assert.equal(playerCrystal.healingOwner,undefined);
 dragon.hp=300;advance(w,.5);assert.equal(dragon.hp,300);
 w.hurt(dragon,300);advance(w,.2);assert.equal(dragon.alive,false);assert.equal(dragon.hp,0);
});

test('surviving Dragon crystals do not stop victory after every actual enemy is defeated',()=>{
 const {w,dragon}=dragonWorld();assert.equal(healingCrystals(w,dragon).length,2);
 for(const e of w.enemies)w.hurt(e,e.hp);
 const state={shots:1,launch:null,quiet:0,winWait:0};let result=null;
 for(let i=0;i<600&&result===null;i++){w.step(DT);result=updateOutcome(state,w,DT);}
 assert.equal(result,true);assert.equal(dragon.alive,false);
});

test('the Golem shield reflects one front projectile without spending its damage source',()=>{
 const {w,golem}=golemWorld();shieldReady(w,golem);
 const stone=approaching(w,golem);
 until(w,()=>stone.body.velocity.x<0||golem.hp<450,1);
 assert.equal(golem.hp,450);assert.ok(stone.body.velocity.x<0);assert.equal(stone.dead,undefined);
 assert.equal(golem.projectileHits.has(stone.id),false);assert.equal(golem.hitSources.has(`ammo:${stone.id}`),false);
 assert.notEqual(golem.echoShieldActive,true);assert.ok(golem.echoRecoveryUntil>w.time);
 // Return the same physical stone from the rear: reflection must not consume its one valid hit.
 advance(w,.2);
 M.Body.setPosition(stone.body,{x:golem.body.position.x+110,y:golem.body.position.y});
 M.Body.setVelocity(stone.body,{x:-15,y:0});M.Sleeping.set(stone.body,false);
 until(w,()=>golem.hp<450,1);
 assert.equal(golem.hp,300);assert.ok(golem.hitSources.has(`ammo:${stone.id}`));
 advance(w,.3);assert.equal(golem.hp,300);
});

test('the Golem telegraph is visible before protection and a front hit still deals normal damage',()=>{
 const {w,golem}=golemWorld();advance(w,.3);
 assert.notEqual(golem.echoShieldActive,true);assert.ok(golem.pose.attackCharge>0);
 approaching(w,golem);
 until(w,()=>golem.hp<450,.5);
 assert.equal(golem.hp,350);assert.equal(w.events.filter(e=>e.type==='echoReflect').length,0);
});

test('two incoming stones can consume only one shield reflection before the recovery hit',()=>{
 const {w,golem}=golemWorld();shieldReady(w,golem);
 for(const dy of [-20,20])w.spawnProjectile('cobble',golem.body.position.x-110,golem.body.position.y+dy,900,0);
 until(w,()=>golem.hp<450,1);
 assert.equal(golem.hp,300);assert.equal(w.events.filter(e=>e.type==='echoReflect').length,1);
 assert.equal(golem.projectileHits.size,1);
});

test('an active Golem shield admits a projectile from behind',()=>{
 const {w,golem}=golemWorld();shieldReady(w,golem);
 const stone=approaching(w,golem,'cobble',1);
 until(w,()=>golem.hp<450,1);
 assert.equal(golem.hp,350);assert.ok(golem.hitSources.has(`ammo:${stone.id}`));
});

test('an active Golem shield admits a loyal returning trident from the front',()=>{
 const {w,golem}=golemWorld();shieldReady(w,golem);
 const trident=w.spawnProjectile('trident',golem.body.position.x-110,golem.body.position.y,900,0,{returnHome:{x:1200,y:golem.body.position.y}});
 trident.returning=true;trident.body.isSensor=true;
 until(w,()=>golem.hp<450,1);
 assert.equal(golem.hp,350);assert.ok(golem.hitSources.has(`ammo:${trident.id}:return`));
 assert.ok(trident.body.velocity.x>0);
});

test('a real TNT explosion damages the Golem through its active shield',()=>{
 const {w,golem}=golemWorld();shieldReady(w,golem);
 w.blast(golem.body.position.x,golem.body.position.y);
 assert.equal(golem.hp,300);assert.ok(golem.hitSources.has('blast:1'));
});
