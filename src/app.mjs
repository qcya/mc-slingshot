import { WIDTH, HEIGHT, AMMO, clamp } from './config.mjs';
import { Assets } from './assets.mjs';
import { buildLevel, LEVELS } from './levels.mjs';
import { SiegeWorld } from './world.mjs';
import { Renderer, armTip, PIVOT, REST, RELEASE } from './renderer.mjs';
import {aimAngle} from './aim.mjs';

const $=s=>document.querySelector(s),canvas=$('#stage'),loadState=$('#loadState');
const state={level:0,shots:0,selected:0,paused:false,ended:false,drag:false,angle:REST,power:0,vx:0,vy:0,launch:null,quiet:0,winWait:0,launched:0};
let world,renderer,assets,scene,acc=0,previous=0,fps=60,stepMs=0,maxStepMs=0;

function hud(){
  $('#ammo').textContent=`${AMMO[state.selected].label} · 剩余 ${state.shots} 发`;
  $('#pause').textContent=state.paused?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',state.paused?'▶ 继续':'Ⅱ 暂停');
  for(const [i,b] of [...$('#ballbar').children].entries()){
    b.classList.toggle('selected',i===state.selected);b.setAttribute('aria-pressed',String(i===state.selected));
  }
}
function loadLevel(n){
  if(world){window.Matter.Events.off(world.engine);window.Matter.Composite.clear(world.engine.world,false);window.Matter.Engine.clear(world.engine);}
  scene=buildLevel(n);world=new SiegeWorld(window.Matter,{grid:scene.grid,rear:scene.rear});
  for(const e of scene.enemies)world.addEnemy(e.x,e.feet,e.skin);
  Object.assign(state,{level:n,shots:scene.shots,ended:false,paused:false,drag:false,angle:REST,launch:null,quiet:0,winWait:0,power:0,launched:0});
  renderer.reset(scene);acc=0;maxStepMs=0;$('#levelSelect').value=String(n);
  $('#result').classList.add('hidden');$('#gamehint').classList.remove('faded');$('#gamehint').textContent='拖住投石臂上的弹药，向左下蓄力，松手抛射';hud();
}
function launcher(){return {...state,ammo:AMMO[state.launch?.kind??state.selected],loaded:!state.ended&&state.shots>0&&(!state.launch||!state.launch.released)};}
function result(win){
  state.ended=true;$('#result').classList.remove('hidden');
  $('#resultFlag').textContent=win?'挑战成功':'再试一次';$('#resultTitle').textContent=win?'敌对生物已清除':'弹药用完了';
  $('#resultMsg').textContent=win?`击毁 ${world.stats.removed.toLocaleString()} 个纹理像素。`:'调整力度，或换一种弹药攻击支撑。';
  $('#nextBtn').textContent=state.level===4?'从头开始 ↻':'下一关 →';
}
function animateLauncher(dt){
  const a=state.launch;if(!a)return;a.age+=dt;
  if(a.age<.22){const t=a.age/.22;state.angle=a.from+(RELEASE-a.from)*t*t;}
  else{
    if(!a.released){const p=armTip(RELEASE);world.spawnProjectile(AMMO[a.kind].id,p.x,p.y,a.vx,a.vy);a.released=true;state.shots--;state.launched++;assets.play('wood',.24);hud();}
    if(a.age<.4)state.angle=RELEASE+(a.age-.22)/.18*.62;
    else state.angle=-.29+(REST+.29)*clamp((a.age-.4)/.6,0,1);
    if(a.age>=1){state.launch=null;state.angle=REST;}
  }
}
function update(dt){
  animateLauncher(dt);const start=performance.now();world.step(dt);const duration=performance.now()-start;
  stepMs=stepMs*.97+duration*.03;maxStepMs=Math.max(maxStepMs,duration);renderer.update(world,dt);
  if(!state.ended){
    if(world.enemies.every(e=>!e.alive)){state.winWait+=dt;if(state.winWait>.9)result(true);}
    else state.winWait=0;
    if(state.shots===0&&!state.launch&&!world.active()){state.quiet+=dt;if(state.quiet>2)result(false);}else state.quiet=0;
  }
}
function frame(now){
  const elapsed=previous?Math.min(.1,(now-previous)/1000):0;previous=now;
  if(elapsed>0)fps=fps*.95+(1/elapsed)*.05;
  if(!state.paused){acc+=elapsed;let steps=0;while(acc>=1/120&&steps++<12){update(1/120);acc-=1/120;}}else acc=0;
  renderer.draw(world,launcher(),state.paused);hud();requestAnimationFrame(frame);
}
function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height};}
function cancelDrag(){state.drag=false;state.angle=REST;state.power=0;}
function beginDrag(e){
  if(state.ended||state.paused||!state.shots||state.launch)return;
  const p=point(e),tip=armTip(state.angle);if(Math.hypot(p.x-tip.x,p.y-tip.y)>65)return;
  state.drag=true;state.start=p;state.pointerId=e.pointerId;state.power=0;state.vx=0;state.vy=0;
  canvas.setPointerCapture(e.pointerId);e.preventDefault();
}
function moveDrag(e){
  if(!state.drag||e.pointerId!==state.pointerId)return;
  const p=point(e),dx=state.start.x-p.x,dy=state.start.y-p.y,length=Math.hypot(dx,dy),scale=length>135?135/length:1;
  state.vx=clamp(dx*scale*8.4,0,1110);state.vy=clamp(dy*scale*8.4,-920,100);state.power=Math.min(1,length/135);
  state.angle=aimAngle(p,PIVOT);
}
function endDrag(e){
  if(!state.drag||e.pointerId!==state.pointerId)return;
  state.drag=false;if(state.power<.12||state.vx<120){cancelDrag();return;}
  state.launch={age:0,from:state.angle,kind:state.selected,vx:state.vx,vy:state.vy,released:false};
  $('#gamehint').classList.add('faded');
}
function select(i){if(state.launch||state.drag)return;state.selected=clamp(i,0,3);hud();}
function pause(){cancelDrag();state.paused=!state.paused;hud();}
function status(){
  const snapshot=world.snapshot(),tip=armTip(state.angle);
  return {...snapshot,ready:true,level:state.level+1,shots:state.shots,launched:state.launched,
    selected:AMMO[state.selected].id,paused:state.paused,ended:state.ended,particles:renderer.particles.length,
    projectiles:snapshot.projectiles.length,ammoBodies:snapshot.projectiles,restingBlocks:snapshot.projectiles.filter(p=>p.sleeping).length,
    fps:Math.round(fps),stepMs:+stepMs.toFixed(2),maxStepMs:+maxStepMs.toFixed(2),
    launcher:{x:tip.x,y:tip.y,angle:state.angle,phase:state.drag?'aim':state.launch?'throw':'ready'}};
}
async function start(){
  if(!window.Matter?.Engine)throw new Error('Matter.js 未加载。请检查 vendor/matter.min.js 并通过启动脚本运行。');
  assets=await new Assets().load();renderer=new Renderer(canvas,assets);
  AMMO.forEach((a,i)=>{
    const b=document.createElement('button');b.className='ball';b.title=`${i+1} · ${a.label} · ${a.detail}`;b.setAttribute('aria-label',`${i+1}. ${a.label}`);
    if(a.sprite){const img=document.createElement('img');img.src=`assets/textures/${a.sprite}.png`;img.alt='';b.append(img);}
    else{const icon=document.createElement('span');icon.className='blackhole-icon';b.append(icon);}
    b.addEventListener('click',()=>select(i));$('#ballbar').append(b);
  });
  for(let i=4;i<9;i++){const empty=document.createElement('button');empty.className='ball';empty.disabled=true;empty.setAttribute('aria-label','空物品格');$('#ballbar').append(empty);}
  LEVELS.forEach((l,i)=>{const o=document.createElement('option');o.value=i;o.textContent=l.title;$('#levelSelect').append(o);});
  loadLevel(0);loadState.hidden=true;
  canvas.addEventListener('pointerdown',beginDrag);canvas.addEventListener('pointermove',moveDrag);canvas.addEventListener('pointerup',endDrag);
  canvas.addEventListener('pointercancel',cancelDrag);canvas.addEventListener('lostpointercapture',()=>{if(state.drag)cancelDrag();});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  for(const id of ['restart','retryBtn'])$(`#${id}`).addEventListener('click',()=>loadLevel(state.level));
  for(const id of ['skip','nextBtn'])$(`#${id}`).addEventListener('click',()=>loadLevel((state.level+1)%5));
  $('#levelSelect').addEventListener('change',e=>{loadLevel(Number(e.target.value));e.target.blur();});
  $('#pause').addEventListener('click',pause);$('#soundToggle').addEventListener('click',()=>{assets.soundOn=!assets.soundOn;$('#soundToggle').textContent=assets.soundOn?'♫':'♪';$('#soundToggle').setAttribute('aria-label',assets.soundOn?'音效开':'音效关');});
  window.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    if(e.key>='1'&&e.key<='4')select(Number(e.key)-1);
    if(e.key.toLowerCase()==='r')loadLevel(state.level);if(e.key.toLowerCase()==='n')loadLevel((state.level+1)%5);
    if(e.code==='Space'){e.preventDefault();pause();}
  });
  window.addEventListener('blur',()=>{if(state.drag)cancelDrag();});
  window.MCBlockLaunch={getStatus:status,restart:()=>loadLevel(state.level),next:()=>loadLevel((state.level+1)%5),select,
    getDiagnostics:()=>({assets:Object.keys(assets.images),...status(),enemies:world.enemies.map(e=>({skin:e.skin,hp:e.hp,alive:e.alive,x:e.body.position.x,y:e.body.position.y,facing:e.facing,walkDistance:e.walkDistance,turns:e.turns})),
      backgroundPixels:world.rear.grid.count(),movingBackgroundPixels:world.debris.reduce((n,e)=>n+(e.dead?0:e.backPixels.length),0),
      terrainPixels:world.grid.count(),debrisPixels:world.debris.reduce((n,e)=>n+(e.dead?0:e.count),0),sound:{...assets.audioStats,played:{...assets.audioStats.played}},physicsParts:window.Matter.Composite.allBodies(world.engine.world).reduce((n,b)=>n+b.parts.length,0)})};
  requestAnimationFrame(frame);
}
start().catch(error=>{loadState.hidden=false;loadState.classList.add('error');loadState.textContent=`游戏未能启动：${error.message}`;console.error(error);});
