import {WIDTH,AMMO,clamp} from './config.mjs';
import {Assets} from './assets.mjs';import {buildLevel,LEVELS} from './levels.mjs';import {SiegeWorld} from './world.mjs';import {Renderer} from './renderer.mjs';
import {SLING_HOME,pullSling} from './sling.mjs';import {DrawAudio} from './draw-audio.mjs';
import {SAVE_KEY,readProgress,finishLevel,canEnter,inventoryFor,totalAmmo,spendAmmo,rewardFor} from './campaign.mjs';
import {mobAppearance} from './animation.mjs';
import {updateOutcome} from './outcome.mjs';
const $=s=>document.querySelector(s),canvas=$('#stage'),loadState=$('#loadState');
const state={level:0,inventory:inventoryFor(0),shots:5,selected:0,screen:'levels',paused:true,ended:false,drag:false,angle:0,pouch:{...SLING_HOME},power:0,vx:0,vy:0,launch:null,quiet:0,winWait:0,launched:0};
let world,renderer,assets,scene,drawAudio,progress,acc=0,previous=0,fps=60,stepMs=0,maxStepMs=0,inventoryUntil=0;
function iconUrl(i){const icon=assets.icons[AMMO[i].id];return icon instanceof HTMLCanvasElement?icon.toDataURL():icon.src;}
function hud(){
 state.shots=totalAmmo(state.inventory);
 for(const [i,b] of [...$('#ballbar').children].entries()){
  const count=state.inventory[i]||0;b.classList.toggle('selected',i===state.selected);b.classList.toggle('empty',!count);b.setAttribute('aria-pressed',String(i===state.selected));
  if(i<AMMO.length){b.querySelector('.stack-count').textContent=count>1?String(count):'';b.setAttribute('aria-label',`${i+1}. ${AMMO[i].label} · ${count} 个`);}
 }
}
function revealInventory(ms=2200){inventoryUntil=performance.now()+ms;$('#inventory').classList.remove('tucked');}
function menus(screen){
 state.screen=screen;state.paused=screen!=='play';
 $('#levelMenu').classList.toggle('hidden',screen!=='levels');$('#pauseMenu').classList.toggle('hidden',screen!=='pause');$('#result').classList.toggle('hidden',screen!=='result');
 $('#gameRoot').classList.toggle('menu-open',screen!=='play');
}
function renderCards(){
 const container=$('#levelCards');container.replaceChildren();
 LEVELS.forEach((level,i)=>{
  const b=document.createElement('button');b.className='level-card';b.dataset.level=i;b.id='level-'+i;b.disabled=!canEnter(progress,i);
  const number=document.createElement('span');number.className='level-number';number.textContent=String(i+1).padStart(2,'0');
  const name=document.createElement('strong');name.textContent=level.title.replace(/^0\d \/ /,'');
  const supplies=document.createElement('span');supplies.textContent=b.disabled?'通过前一关解锁':inventoryFor(i).map((n,j)=>n?`${AMMO[j].label} ×${n}`:'').filter(Boolean).join(' · ');
  const flag=document.createElement('small');flag.textContent=b.disabled?'未解锁':progress.completed.includes(i)?'已通关 · 可重玩':i===progress.unlocked-1?'开始挑战':'已解锁';
  b.append(number,name,supplies,flag);b.addEventListener('click',()=>loadLevel(i));container.append(b);
 });
}
function cancelDrag(){drawAudio?.stop();state.drag=false;state.angle=0;state.power=0;state.vx=state.vy=0;if(!state.launch)state.pouch={...SLING_HOME};}
function loadLevel(n){
 if(!canEnter(progress,n))return false;cancelDrag();
 if(world){window.Matter.Events.off(world.engine);window.Matter.Composite.clear(world.engine.world,false);window.Matter.Engine.clear(world.engine);}
 scene=buildLevel(n);world=new SiegeWorld(window.Matter,{grid:scene.grid,rear:scene.rear});for(const e of scene.enemies)world.addEnemy(e.x,e.feet,e.skin);
 Object.assign(state,{level:n,inventory:inventoryFor(n),selected:0,ended:false,drag:false,angle:0,pouch:{...SLING_HOME},launch:null,quiet:0,winWait:0,power:0,launched:0});
 renderer.reset(scene);acc=0;maxStepMs=0;menus('play');$('#gamehint').classList.remove('faded');$('#gamehint').textContent='拖动瞄准 · 右键取消 · 滚轮换物品 · ESC 菜单';hud();revealInventory(3200);return true;
}
function showLevels(){cancelDrag();renderCards();menus('levels');}
function pause(){if(state.screen==='play'){cancelDrag();menus('pause');}else if(state.screen==='pause'){menus('play');revealInventory();}}
function launcher(){return {...state,ammo:AMMO[state.launch?.kind??state.selected]||AMMO[0],loaded:!!state.inventory[state.selected]&&!state.ended&&(!state.launch||!state.launch.released)};}
function result(win){
 state.ended=true;cancelDrag();const first=!progress.completed.includes(state.level),reward=win&&first?rewardFor(state.level):null;
 if(win){progress=finishLevel(progress,state.level);try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}catch{}}
 $('#resultFlag').textContent=win?'挑战成功':'再试一次';$('#resultTitle').textContent=reward?`已解锁 ${reward}`:win?(state.level===4?'全部关卡已通关':'敌对生物已清除'):'弹药用完了';
 $('#resultMsg').textContent=reward?'下一关可以使用这件新物品。':win?'可以继续下一关，也可以重玩当前关卡。':'调整角度，合理使用每一件物品。';
 $('#rewardIcon').classList.toggle('hidden',!reward);if(reward)$('#rewardIcon').src=iconUrl(state.level+1);
 $('#nextBtn').classList.toggle('hidden',!win||state.level===4);$('#nextBtn').textContent='进入下一关';menus('result');
}
function animateLauncher(dt){
 const a=state.launch;if(!a)return;a.age+=dt;const recoil=Math.cos(a.age*29)*Math.exp(-a.age*11);state.pouch={x:SLING_HOME.x+a.dx*recoil,y:SLING_HOME.y+a.dy*recoil};
 if(a.age>.5){state.launch=null;state.pouch={...SLING_HOME};state.angle=0;}
}
function update(dt){
 animateLauncher(dt);const start=performance.now();world.step(dt);const duration=performance.now()-start;stepMs=stepMs*.97+duration*.03;maxStepMs=Math.max(maxStepMs,duration);renderer.update(world,dt);
 if(!state.ended){const outcome=updateOutcome(state,world,dt);if(outcome!==null)result(outcome);}
}
function frame(now){
 const elapsed=previous?Math.min(.1,(now-previous)/1000):0;previous=now;if(elapsed>0)fps=fps*.95+(1/elapsed)*.05;
 if(!state.paused){acc+=elapsed;let steps=0;while(!state.paused&&acc>=1/120&&steps++<12){update(1/120);acc-=1/120;}}else acc=0;
 drawAudio.tick();$('#inventory').classList.toggle('tucked',now>inventoryUntil&&!state.drag);renderer.draw(world,launcher(),false);requestAnimationFrame(frame);
}
function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*864/r.height};}
function beginDrag(e){
 if(e.button===2){cancelDrag();e.preventDefault();return;}if(e.button!==0||state.screen!=='play'||state.ended||state.launch||!state.inventory[state.selected])return;
 const p=point(e);if(Math.hypot(p.x-state.pouch.x,p.y-state.pouch.y)>55)return;
 state.drag=true;state.pointerId=e.pointerId;state.power=0;state.vx=state.vy=0;canvas.setPointerCapture(e.pointerId);e.preventDefault();if(assets.soundOn)drawAudio.begin();
}
function moveDrag(e){
 if(!state.drag||e.pointerId!==state.pointerId)return;if(e.buttons&2){cancelDrag();return;}
 const shot=pullSling(point(e)),distance=Math.hypot(shot.origin.x-state.pouch.x,shot.origin.y-state.pouch.y);
 state.pouch=shot.origin;state.vx=shot.vx;state.vy=shot.vy;state.power=shot.power;if(assets.soundOn)drawAudio.update(shot.power,distance);
}
function endDrag(e){
 if(!state.drag||e.pointerId!==state.pointerId)return;state.drag=false;drawAudio.stop();const kind=state.selected;
 if(!spendAmmo(state.inventory,kind))return;world.spawnProjectile(AMMO[kind].id,state.pouch.x,state.pouch.y,state.vx,state.vy);
 state.launch={age:0,kind,dx:state.pouch.x-SLING_HOME.x,dy:state.pouch.y-SLING_HOME.y,released:true};state.launched++;
 if(!state.inventory[kind])state.selected=Math.max(0,state.inventory.findIndex(n=>n>0));
 assets.play('bow',.2);hud();revealInventory(1600);$('#gamehint').classList.add('faded');
}
function select(i){if(state.screen!=='play'||state.launch||state.drag)return;state.selected=clamp(i,0,8);hud();revealInventory();}
function status(){
 const s=world.snapshot();return {...s,ready:true,level:state.level+1,shots:state.shots,inventory:[...state.inventory],ammoCounts:Object.fromEntries(AMMO.map((a,i)=>[a.id,state.inventory[i]])),screen:state.screen,unlocked:progress.unlocked,
 launched:state.launched,selected:AMMO[state.selected]?.id||'empty',selectedSlot:state.selected,paused:state.paused,ended:state.ended,particles:renderer.particles.length,projectiles:s.projectiles.length,ammoBodies:s.projectiles,restingBlocks:s.projectiles.filter(p=>p.sleeping).length,
 fps:Math.round(fps),stepMs:+stepMs.toFixed(2),maxStepMs:+maxStepMs.toFixed(2),launcher:{x:state.pouch.x,y:state.pouch.y,vx:state.vx,vy:state.vy,angle:state.angle,phase:state.drag?'aim':state.launch?'recoil':'ready',type:'slingshot'}};
}
async function start(){
 if(!window.Matter?.Engine)throw new Error('Matter.js 未加载。请通过启动脚本运行。');
 assets=await new Assets().load();renderer=new Renderer(canvas,assets);drawAudio=await new DrawAudio().load(assets.sounds.crossbow_pull.src);
 try{progress=readProgress(localStorage.getItem(SAVE_KEY));}catch{progress=readProgress(null);}
 for(let i=0;i<9;i++){
  const b=document.createElement('button');b.className='ball';b.setAttribute('aria-label',i<AMMO.length?AMMO[i].label:`${i+1}. 空物品格`);
  if(i<AMMO.length){const img=document.createElement('img');img.src=iconUrl(i);img.alt='';const count=document.createElement('span');count.className='stack-count';b.append(img,count);}
  b.addEventListener('click',()=>select(i));$('#ballbar').append(b);
 }
 loadLevel(progress.unlocked-1);showLevels();loadState.hidden=true;
 canvas.addEventListener('pointerdown',beginDrag);canvas.addEventListener('pointermove',moveDrag);canvas.addEventListener('pointerup',endDrag);
 canvas.addEventListener('pointercancel',cancelDrag);canvas.addEventListener('lostpointercapture',()=>{if(state.drag)cancelDrag();});
 canvas.addEventListener('mousedown',e=>{if(e.button===2){cancelDrag();e.preventDefault();}});canvas.addEventListener('contextmenu',e=>{cancelDrag();e.preventDefault();});
 $('#resume').addEventListener('click',pause);for(const id of ['restart','retryBtn'])$('#'+id).addEventListener('click',()=>loadLevel(state.level));
 for(const id of ['levelMenuBtn','resultLevels'])$('#'+id).addEventListener('click',showLevels);$('#nextBtn').addEventListener('click',()=>loadLevel(state.level+1));
 $('#soundToggle').addEventListener('click',()=>{assets.soundOn=!assets.soundOn;drawAudio.setMuted(!assets.soundOn);$('#soundToggle').textContent=assets.soundOn?'音效：开':'音效：关';});
 let lastWheel=-Infinity;$('#gameRoot').addEventListener('wheel',e=>{
  if(e.ctrlKey||!e.deltaY||state.screen!=='play')return;e.preventDefault();revealInventory();const now=performance.now();if(now-lastWheel<90)return;lastWheel=now;select((state.selected+Math.sign(e.deltaY)+9)%9);
 },{passive:false});
 $('#gameRoot').addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();if(state.screen==='play'&&e.clientY>r.bottom-r.height*.10)revealInventory();});
 window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();pause();return;}if(state.screen!=='play')return;
  if(e.key>='1'&&e.key<='9')select(Number(e.key)-1);if(e.key.toLowerCase()==='r')loadLevel(state.level);if(e.code==='Space'){e.preventDefault();pause();}
 });
 window.addEventListener('blur',()=>{if(state.drag)cancelDrag();});
 window.MCBlockLaunch={getStatus:status,restart:()=>loadLevel(state.level),next:()=>loadLevel(state.level+1),playLevel:loadLevel,select,
 getDiagnostics:()=>({assets:Object.keys(assets.images),...status(),enemies:world.enemies.map(e=>({skin:e.skin,hp:e.hp,alive:e.alive,dead:!!e.dead,appearance:mobAppearance(e,world.time),x:e.body.position.x,y:e.body.position.y,facing:e.facing,walkDistance:e.walkDistance,turns:e.turns,behavior:e.behavior,pose:e.pose})),whiteParticles:renderer.particles.filter(p=>p.poof).length,
 drawSound:drawAudio.diagnostics(),preview:state.drag?[...(renderer.arc||[])]:[],backgroundPixels:world.rear.grid.count(),movingBackgroundPixels:0,terrainPixels:world.grid.count(),debrisPixels:world.debris.reduce((n,e)=>n+(e.dead?0:e.count),0),
 sound:{...assets.audioStats,played:{...assets.audioStats.played}},physicsParts:window.Matter.Composite.allBodies(world.engine.world).reduce((n,b)=>n+b.parts.length,0)})};
 requestAnimationFrame(frame);
}
start().catch(error=>{loadState.hidden=false;loadState.classList.add('error');loadState.textContent=`游戏未能启动：${error.message}`;console.error(error);});
