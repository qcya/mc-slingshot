import {WIDTH,AMMO,clamp} from './config.mjs';
import {Assets} from './assets.mjs';import {buildLevel,LEVELS} from './levels.mjs';import {SiegeWorld} from './world.mjs';import {Renderer} from './renderer.mjs';
import {SLING_HOME,pullSling} from './sling.mjs';import {DrawAudio} from './draw-audio.mjs';
import {SAVE_KEY,readProgress,finishLevel,canEnter,inventoryFor,hotbarSlots,totalAmmo,spendAmmo,rewardFor} from './campaign.mjs';
import {enterLandscape,exitLandscape} from './fullscreen.mjs';
import {mobAppearance} from './animation.mjs';
import {updateOutcome} from './outcome.mjs';
import {createOnlineClient} from './online.mjs';
import {createToyOnlineClient} from './toy-online.mjs';
import {createToyStorage} from './toy-storage.mjs';
import {BackgroundMusic} from './music.mjs';
import {buildTitleScene} from './title-scene.mjs';
import {TIME_SAVE_KEY,TIME_QUEUE_KEY,normalizeTimes,recordBestTime,timeBundle,parseTimeBundle,formatTime} from './timing.mjs';
const $=s=>document.querySelector(s),canvas=$('#stage'),loadState=$('#loadState');
const coarsePointer=matchMedia('(pointer:coarse)'),cancelledTouchClicks=new Set();
const state={level:0,inventory:inventoryFor(0),shots:5,selected:0,screen:'levels',paused:true,ended:false,drag:false,angle:0,pouch:{...SLING_HOME},power:0,vx:0,vy:0,launch:null,quiet:0,winWait:0,launched:0};
let world,renderer,assets,scene,drawAudio,music,progress,profile,acc=0,previous=0,fps=60,stepMs=0,maxStepMs=0,inventoryUntil=0,nativeImmersive=false,fullscreenBusy=false,levelPage=0;
const nativeOnline=globalThis.MC_PLATFORM?.ranking==='toy';
const PROFILE_KEY='mc-block-launch.profile.v1',PENDING_KEY=TIME_QUEUE_KEY,online=nativeOnline?createToyOnlineClient({getUser:()=>appStorage.user(),getTimes:()=>readLocal(TIME_SAVE_KEY,[])}):createOnlineClient({baseUrl:globalThis.MC_PLATFORM?.apiBaseUrl||''});let profileReturn='levels',syncing=false,profileRevision=0,leaderboardRevision=0,bestTimes;
const appStorage=createToyStorage({enabled:globalThis.MC_PLATFORM?.toy===true,storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},onStatus:s=>{const node=$('#cloudState');if(node){node.hidden=!s.enabled;node.textContent=s.lastError?'云存档暂未同步，进度已暂存本机':s.dirty?'云存档正在同步…':'Toy 云存档已连接';}}});
function readLocal(key,fallback){try{return JSON.parse(appStorage.getItem(key))||fallback;}catch{return fallback;}}
function saveLocal(key,value){try{appStorage.setItem(key,JSON.stringify(value));}catch{}}
function pendingResults(){const raw=readLocal(PENDING_KEY,[]);return Array.isArray(raw)?raw.map(parseTimeBundle).filter(Boolean):[];}
function queueBestTimes(){const bundle=timeBundle(bestTimes);if(bundle)saveLocal(PENDING_KEY,[bundle]);}
async function restoreTimes(){
 if(!profile?.token)return;const revision=profileRevision;
 try{const reply=await online.profile(profile.token);if(revision!==profileRevision)return;if(!profile.dirty&&reply.profile?.id===profile.id&&typeof reply.profile.nickname==='string'){profile={...profile,nickname:reply.profile.nickname};saveLocal(PROFILE_KEY,profile);profileLabel();}const bundle=parseTimeBundle(reply);if(!bundle)return;for(const s of bundle.stages)bestTimes=recordBestTime(bestTimes,s.stage,s.timeMs);saveLocal(TIME_SAVE_KEY,bestTimes);queueBestTimes();if(state.screen==='levels')renderCards();}catch{/* Offline play keeps local records. */}
}
function profileLabel(){$('#profileBtn').textContent=profile?.nickname?`玩家：${profile.nickname}`:'设置昵称';}
async function syncResults(){
 if(syncing||!profile?.nickname||state.screen==='profile')return;syncing=true;const revision=profileRevision;
 try{
  if(profile.token&&profile.dirty){try{const reply=await online.updateProfile(profile.token,profile.nickname);if(revision!==profileRevision)return;profile={...reply.profile,token:profile.token};}catch(error){if(revision!==profileRevision)return;if(error.status!==401)throw error;profile.token=null;}}
  if(!profile.token){const reply=await online.createProfile(profile.nickname);if(revision!==profileRevision)return;profile={...reply.profile,token:reply.token};}saveLocal(PROFILE_KEY,profile);profileLabel();await restoreTimes();if(revision!==profileRevision)return;
  while(pendingResults().length){const score=pendingResults()[0];if(revision!==profileRevision)return;try{await online.submitResult(profile.token,score);}catch(error){if(revision!==profileRevision)return;if(error.status===401){profile.token=null;saveLocal(PROFILE_KEY,profile);}throw error;}if(revision!==profileRevision)return;const rest=pendingResults().filter(s=>JSON.stringify(s)!==JSON.stringify(score));saveLocal(PENDING_KEY,rest);}
 }catch(error){if(error.status===409&&revision===profileRevision){showProfile();$('#profileStatus').textContent='用户名已占用';}else console.info('成绩保存在本机，联网后重试。',error.message);}finally{syncing=false;if(revision!==profileRevision&&state.screen!=='profile')queueMicrotask(syncResults);}
}
function showProfile(){profileRevision++;profileReturn=state.screen==='profile'?'levels':state.screen;cancelDrag();$('#saveProfile').disabled=false;$('#nickname').value=profile?.nickname||'';$('#nickname').readOnly=!!(nativeOnline&&appStorage.user()?.nickname);$('#profileStatus').textContent=$('#nickname').readOnly?'使用当前 B 站账号昵称，改名后刷新游戏同步。':'昵称 1—16 个字符；不需要密码。';$('#profileBack').classList.toggle('hidden',!profile);menus('profile');}
async function saveProfile(event){
 event.preventDefault();if($('#saveProfile').disabled)return;const platformName=nativeOnline&&appStorage.user()?.nickname,nickname=platformName||$('#nickname').value.normalize('NFKC').trim().replace(/ +/g,' ');if(!platformName&&(!nickname||[...nickname].length>16||! /^[\p{L}\p{N}\p{M}_ -]+$/u.test(nickname)||!/[\p{L}\p{N}]/u.test(nickname))){$('#profileStatus').textContent='请输入 1—16 个字母、汉字或数字，可含空格、下划线和短横线。';return;}
 const revision=++profileRevision,returnTo=profileReturn;$('#saveProfile').disabled=true;let nextProfile;
 try{const reply=profile?.token?await online.updateProfile(profile.token,nickname):await online.createProfile(nickname);nextProfile={...reply.profile,token:reply.token||profile?.token};}
 catch(error){if(revision!==profileRevision)return;if([400,403,409].includes(error.status)){$('#profileStatus').textContent=error.status===409?'用户名已占用':error.status===403?'这是测试记录，不能修改昵称':'这个昵称无法使用，请调整后再试。';$('#saveProfile').disabled=false;return;}nextProfile={...profile,nickname,dirty:true};if(error.status===401)nextProfile.token=null;}
 if(revision!==profileRevision)return;profile=nextProfile;$('#saveProfile').disabled=false;saveLocal(PROFILE_KEY,profile);profileLabel();if(state.screen==='profile')menus(returnTo);void syncResults();
}
async function showLeaderboard(){
 cancelDrag();menus('leaderboard');$('#rankingRows').replaceChildren();const revision=++leaderboardRevision;
 $('#leaderboardStatus').textContent='正在读取排行榜…';
 try{const {entries}=await online.leaderboard();if(state.screen!=='leaderboard'||revision!==leaderboardRevision)return;$('#leaderboardStatus').textContent=entries.length?(nativeOnline?'十关个人最快时间之和，用时越短排名越高，精度 0.01 秒，仅显示前 100 名。':'十关个人最快时间之和，用时越短排名越高，仅显示前 100 名。'):'还没有全通成绩，来成为第一位挑战者。';
  for(const entry of entries.slice(0,100)){const row=document.createElement('tr');if(entry.id===profile?.id)row.className='self';for(const value of [entry.rank,entry.nickname,formatTime(entry.totalTimeMs)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('#rankingRows').append(row);}
 }catch(error){if(state.screen==='leaderboard'&&revision===leaderboardRevision)$('#leaderboardStatus').textContent=nativeOnline?`Toy 排行榜暂不可用：${error.message||error.code||'连接失败'}。通关成绩已保存在本机。`:'暂时连接不上排行榜。仍可游玩，通关成绩会保存在本机。';}
}
function fullscreenLabel(){const active=nativeImmersive||!!(document.fullscreenElement||document.webkitFullscreenElement);$('#fullscreenBtn').textContent=active?'取消全屏':'全屏';$('#rotateFullscreen').textContent=active?'取消全屏':'全屏游玩';return active;}
async function fullscreen(){if(fullscreenBusy)return;fullscreenBusy=true;const onStatus=text=>{const node=$('#fullscreenStatus');node.textContent=text;node.hidden=!text;};try{if(fullscreenLabel()){const result=await exitLandscape({isNative:nativeImmersive,onStatus});if(result!=='failed')nativeImmersive=false;}else nativeImmersive=(await enterLandscape({isToy:globalThis.MC_PLATFORM?.toy===true,onStatus}))==='native';}finally{fullscreenBusy=false;fullscreenLabel();}}
function audioLabels(){$('#soundToggle').textContent=assets.soundOn?'音效：开':'音效：关';$('#sfxVolume').value=Math.round(assets.soundVolume*100);$('#sfxValue').textContent=`${Math.round(assets.soundVolume*100)}%`;}
function iconUrl(i){const icon=assets.icons[AMMO[i].id];return icon instanceof HTMLCanvasElement?icon.toDataURL():icon.src;}
function hud(){
 state.shots=totalAmmo(state.inventory);
 for(const [i,b] of [...$('#ballbar').children].entries()){
  const kind=hotbarSlots(progress)[i],count=kind===null?0:state.inventory[kind]||0;b.dataset.ammoIndex=kind===null?'':String(kind);b.classList.toggle('selected',i===state.selected);b.classList.toggle('empty',kind===null);b.classList.toggle('depleted',kind!==null&&!count);b.setAttribute('aria-pressed',String(i===state.selected));
  b.querySelector('.stack-count').textContent=kind!==null&&(count===0||count>1)?String(count):'';b.setAttribute('aria-label',kind===null?`${i+1}. 空物品格`:`${i+1}. ${AMMO[kind].label} · ${count} 个`);if(kind!==null)b.querySelector('img').src=iconUrl(kind);
 }
}
function revealInventory(ms=2200){inventoryUntil=performance.now()+ms;$('#inventory').classList.remove('tucked');}
function menus(screen){
 state.screen=screen;state.paused=screen!=='play';
 for(const [id,name] of [['startScreen','home'],['levelMenu','levels'],['pauseMenu','pause'],['settingsMenu','settings'],['result','result'],['profileMenu','profile'],['leaderboardMenu','leaderboard']])$('#'+id).classList.toggle('hidden',screen!==name);
 $('#gameRoot').classList.toggle('menu-open',screen!=='play');
}
function renderCards(){
 const container=$('#levelCards');container.replaceChildren();
 LEVELS.slice(levelPage*5,levelPage*5+5).forEach((level,offset)=>{const i=levelPage*5+offset;
  const wrapper=document.createElement('div');wrapper.className='level-card-wrap';const b=document.createElement('button');b.className='level-card';b.dataset.level=i;b.id='level-'+i;b.disabled=!canEnter(progress,i);
  const number=document.createElement('span');number.className='level-number';number.textContent=String(i+1).padStart(2,'0');
  const name=document.createElement('strong');name.textContent=level.title.replace(/^\d{2} \/ /,'');
  const best=document.createElement('span');best.className='personal-best';best.textContent=bestTimes?.[i]!=null?`最快 ${formatTime(bestTimes[i])}`:b.disabled?'未解锁':'尚未通关';
  const flag=document.createElement('small');flag.textContent=b.disabled?'未解锁':progress.completed.includes(i)?'已通关 · 可重玩':i===progress.unlocked-1?'开始挑战':'已解锁';
  const info=document.createElement('button');info.className='loadout-info';info.textContent='道具';info.dataset.loadoutLevel=i;info.setAttribute('aria-label',`查看第${i+1}关道具`);info.setAttribute('aria-expanded','false');info.setAttribute('aria-controls',`loadout-${i}`);
  const tip=document.createElement('div');tip.id=`loadout-${i}`;tip.className='loadout-tooltip';tip.setAttribute('role','tooltip');for(const [kind,n]of inventoryFor(i).entries())if(n){const row=document.createElement('div'),img=document.createElement('img'),label=document.createElement('span');img.src=iconUrl(kind);img.alt='';label.textContent=`${AMMO[kind].label} ×${n}`;row.append(img,label);tip.append(row);}
  info.addEventListener('click',()=>{const open=!wrapper.classList.contains('show-loadout');for(const other of container.querySelectorAll('.show-loadout')){other.classList.remove('show-loadout');other.querySelector('.loadout-info').setAttribute('aria-expanded','false');}wrapper.classList.toggle('show-loadout',open);info.setAttribute('aria-expanded',String(open));});
  b.append(number,name,best,flag);b.addEventListener('click',()=>loadLevel(i));wrapper.append(b,info,tip);container.append(wrapper);
 });$('#prevPage').disabled=levelPage===0;$('#nextPage').disabled=(levelPage+1)*5>=LEVELS.length;$('#pageLabel').textContent=`${levelPage+1} / ${Math.ceil(LEVELS.length/5)}`;
}
function cancelDrag(){drawAudio?.stop();state.drag=false;if(state.pointerId!==undefined&&canvas.hasPointerCapture(state.pointerId))canvas.releasePointerCapture(state.pointerId);state.angle=0;state.power=0;state.vx=state.vy=0;if(!state.launch)state.pouch={...SLING_HOME};}
function loadLevel(n,preview=false){
 if(!canEnter(progress,n))return false;cancelDrag();
 if(world){window.Matter.Events.off(world.engine);window.Matter.Composite.clear(world.engine.world,false);window.Matter.Engine.clear(world.engine);}
 scene=preview?buildTitleScene():buildLevel(n);world=new SiegeWorld(window.Matter,{grid:scene.grid,rear:scene.rear});for(const e of scene.enemies)world.addEnemy(e.x,e.feet,e.skin,e);
 Object.assign(state,{level:n,inventory:inventoryFor(n),selected:inventoryFor(n).findIndex(count=>count>0),ended:false,drag:false,angle:0,pouch:{...SLING_HOME},launch:null,quiet:0,winWait:0,power:0,launched:0});
 renderer.reset(scene);acc=0;maxStepMs=0;menus('play');$('#gamehint').classList.remove('faded');$('#gamehint').textContent=coarsePointer.matches?'拖住弹药，松手发射 · 另一指轻点取消':'拖动瞄准 · 右键取消 · 滚轮换物品 · ESC 菜单';hud();revealInventory(3200);return true;
}
function showLevels(){cancelDrag();levelPage=Math.floor(state.level/5);renderCards();menus('levels');}
function showHome(){cancelDrag();loadLevel(0,true);menus('home');}
function enterGame(){if(state.screen!=='home')return;showLevels();if(!profile)showProfile();}
function pause(){if(state.screen==='play'){cancelDrag();menus('pause');}else if(state.screen==='pause'){menus('play');revealInventory();}}
function launcher(){return {...state,ammo:AMMO[state.launch?.kind??state.selected]||AMMO[0],loaded:!!state.inventory[state.selected]&&!state.ended&&(!state.launch||!state.launch.released)};}
function result(win){
 state.ended=true;cancelDrag();const first=!progress.completed.includes(state.level),reward=win&&first?rewardFor(state.level):null;
 if(win){progress=finishLevel(progress,state.level);saveLocal(SAVE_KEY,progress);bestTimes=recordBestTime(bestTimes,state.level,Math.max(100,Math.round(world.time*1000)));saveLocal(TIME_SAVE_KEY,bestTimes);queueBestTimes();if(timeBundle(bestTimes))void syncResults();}
 $('#resultTiming').hidden=!win;if(win)$('#resultTiming').textContent=`本次用时 ${formatTime(world.time*1000)} · 个人最快 ${formatTime(bestTimes[state.level])}`;
 $('#resultFlag').textContent=win?'挑战成功':'再试一次';$('#resultTitle').textContent=reward?`已解锁 ${reward}`:win?(state.level===LEVELS.length-1?'主世界十关已通关':'敌对生物已清除'):'弹药用完了';
 $('#resultMsg').textContent=reward?'下一关可以使用这件新物品。':win?'可以继续下一关，也可以重玩当前关卡。':'调整角度，合理使用每一件物品。';
 $('#rewardIcon').classList.toggle('hidden',!reward);if(reward)$('#rewardIcon').src=iconUrl(state.level+1);
 $('#nextBtn').classList.toggle('hidden',!win||state.level===LEVELS.length-1);$('#nextBtn').textContent='进入下一关';menus('result');
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
 drawAudio.tick();$('#inventory').classList.toggle('tucked',!coarsePointer.matches&&now>inventoryUntil&&!state.drag);renderer.draw(world,launcher(),false,now/1000);requestAnimationFrame(frame);
}
function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*864/r.height};}
function beginDrag(e){
 if(e.button===2){cancelDrag();e.preventDefault();return;}if(e.button!==0||e.isPrimary===false||state.drag||state.screen!=='play'||state.ended||state.launch||!state.inventory[state.selected])return;
 const p=point(e),radius=e.pointerType==='touch'?Math.max(55,24*WIDTH/canvas.getBoundingClientRect().width):55;if(Math.hypot(p.x-state.pouch.x,p.y-state.pouch.y)>radius)return;
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
 assets.play(AMMO[kind].id==='fire'?'fire_launch':'bow',.2);hud();revealInventory(1600);$('#gamehint').classList.add('faded');
}
function select(i){if(state.screen!=='play'||state.launch||state.drag||!Number.isInteger(i))return;state.selected=clamp(i,0,8);hud();revealInventory();}
function status(){
 const s=world.snapshot();return {...s,ready:true,titleScene:!!scene.titleScene,level:state.level+1,shots:state.shots,inventory:[...state.inventory],ammoCounts:Object.fromEntries(AMMO.map((a,i)=>[a.id,state.inventory[i]])),screen:state.screen,unlocked:progress.unlocked,
 launched:state.launched,selected:AMMO[state.selected]?.id||'empty',selectedSlot:state.selected,paused:state.paused,ended:state.ended,particles:renderer.particles.length,burning:world.fires.filter(f=>world.time>=f.startedAt).length,projectiles:s.projectiles.length,ammoBodies:s.projectiles,restingBlocks:s.projectiles.filter(p=>p.sleeping).length,
 fps:Math.round(fps),stepMs:+stepMs.toFixed(2),maxStepMs:+maxStepMs.toFixed(2),launcher:{x:state.pouch.x,y:state.pouch.y,vx:state.vx,vy:state.vy,angle:state.angle,phase:state.drag?'aim':state.launch?'recoil':'ready',type:'slingshot'}};
}
async function start(){
 if(!window.Matter?.Engine)throw new Error('Matter.js 未加载。请通过启动脚本运行。');
 loadState.textContent='正在加载方块纹理与音效…';
 assets=await new Assets().load();renderer=new Renderer(canvas,assets);drawAudio=await new DrawAudio().load(assets.sounds.crossbow_pull.src);
 music=new BackgroundMusic();$('#musicToggle').textContent=music.enabled?'音乐：开':'音乐：关';drawAudio.setVolume(assets.soundVolume);drawAudio.setMuted(!assets.soundOn);audioLabels();
 if(globalThis.MC_PLATFORM?.toy)loadState.textContent='正在连接 Toy 云存档…';await appStorage.initialize();try{progress=readProgress(appStorage.getItem(SAVE_KEY));}catch{progress=readProgress(null);}
 for(let i=0;i<9;i++){
  const b=document.createElement('button');b.className='ball';const img=document.createElement('img');img.alt='';const count=document.createElement('span');count.className='stack-count';b.append(img,count);
  b.addEventListener('click',()=>select(i));$('#ballbar').append(b);
 }
 profile=readLocal(PROFILE_KEY,null);if(typeof profile?.nickname!=='string'||!profile.nickname.trim()||[...profile.nickname].length>16)profile=null;if(nativeOnline&&appStorage.user()?.nickname){const linked=await online.createProfile();profile={...linked.profile,token:linked.token};saveLocal(PROFILE_KEY,profile);}profileLabel();
 bestTimes=normalizeTimes(readLocal(TIME_SAVE_KEY,[]));queueBestTimes();showHome();renderCards();if(profile)void syncResults();loadState.hidden=true;
 $('#startScreen').addEventListener('click',enterGame);$('#startScreen').addEventListener('keydown',e=>{if(e.key==='Enter'||e.code==='Space'){e.preventDefault();enterGame();}});$('#homeBtn').addEventListener('click',showHome);
 $('#prevPage').addEventListener('click',()=>{if(levelPage>0){levelPage--;renderCards();}});$('#nextPage').addEventListener('click',()=>{if((levelPage+1)*5<LEVELS.length){levelPage++;renderCards();}});
 const fullscreenChanged=()=>{if(!fullscreenLabel()){$('#fullscreenStatus').hidden=true;$('#fullscreenStatus').textContent='';}};document.addEventListener('fullscreenchange',fullscreenChanged);document.addEventListener('webkitfullscreenchange',fullscreenChanged);fullscreenLabel();
 document.addEventListener('click',e=>{if(e.target.closest('.loadout-info,.loadout-tooltip'))return;for(const w of document.querySelectorAll('.show-loadout')){w.classList.remove('show-loadout');w.querySelector('.loadout-info').setAttribute('aria-expanded','false');}});
 canvas.addEventListener('pointerdown',beginDrag);canvas.addEventListener('pointermove',moveDrag);canvas.addEventListener('pointerup',endDrag);
 canvas.addEventListener('pointercancel',cancelDrag);canvas.addEventListener('lostpointercapture',()=>{if(state.drag)cancelDrag();});
 canvas.addEventListener('mousedown',e=>{if(e.button===2){cancelDrag();e.preventDefault();}});canvas.addEventListener('contextmenu',e=>{cancelDrag();e.preventDefault();});
 $('#resume').addEventListener('click',pause);for(const id of ['restart','retryBtn'])$('#'+id).addEventListener('click',()=>loadLevel(state.level));
 for(const id of ['levelMenuBtn','resultLevels'])$('#'+id).addEventListener('click',showLevels);$('#nextBtn').addEventListener('click',()=>loadLevel(state.level+1));
 $('#settingsBtn').addEventListener('click',()=>{audioLabels();menus('settings');});$('#settingsBack').addEventListener('click',()=>menus('pause'));$('#pauseHomeBtn').addEventListener('click',showHome);
 $('#soundToggle').addEventListener('click',()=>{assets.setSoundEnabled(!assets.soundOn);drawAudio.setMuted(!assets.soundOn);audioLabels();});$('#sfxVolume').addEventListener('input',e=>{assets.setSoundVolume(Number(e.target.value)/100);drawAudio.setVolume(assets.soundVolume);audioLabels();});
 $('#musicToggle').addEventListener('click',()=>{music.setEnabled(!music.enabled);$('#musicToggle').textContent=music.enabled?'音乐：开':'音乐：关';});
 $('#profileForm').addEventListener('submit',saveProfile);$('#profileBtn').addEventListener('click',showProfile);$('#profileBack').addEventListener('click',()=>{menus(profileReturn);void syncResults();});
 $('#leaderboardBtn').addEventListener('click',showLeaderboard);$('#leaderboardRefresh').addEventListener('click',showLeaderboard);$('#leaderboardBack').addEventListener('click',showLevels);
 for(const id of ['fullscreenBtn','rotateFullscreen'])$('#'+id).addEventListener('click',fullscreen);
 $('#touchPause').addEventListener('click',pause);
 document.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;cancelledTouchClicks.delete(e.pointerId);
  if(state.drag&&e.pointerId!==state.pointerId){cancelledTouchClicks.add(e.pointerId);cancelDrag();e.preventDefault();e.stopImmediatePropagation();}
 },{capture:true,passive:false});
 document.addEventListener('click',e=>{if(e.pointerType==='touch'&&cancelledTouchClicks.has(e.pointerId)){cancelledTouchClicks.delete(e.pointerId);e.preventDefault();e.stopImmediatePropagation();}},true);
 $('#gameRoot').addEventListener('pointerdown',e=>{if(state.screen!=='play'||state.drag)return;const r=canvas.getBoundingClientRect();if(e.clientY>r.bottom-r.height*.12)revealInventory(4000);});
 if(coarsePointer.matches)$('#menuHelp').textContent='拖动发射 · 另一指轻点取消 · 左上角暂停菜单 · 点底部物品切换';
 let lastWheel=-Infinity;$('#gameRoot').addEventListener('wheel',e=>{
  if(e.ctrlKey||!e.deltaY||state.screen!=='play')return;e.preventDefault();revealInventory();const now=performance.now();if(now-lastWheel<90)return;lastWheel=now;select((state.selected+Math.sign(e.deltaY)+9)%9);
 },{passive:false});
 $('#gameRoot').addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();if(state.screen==='play'&&e.clientY>r.bottom-r.height*.10)revealInventory();});
 window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement&&e.key!=='Escape')return;if(state.screen==='home'&&(e.key==='Enter'||e.code==='Space')){e.preventDefault();enterGame();return;}if(e.key==='Escape'){e.preventDefault();if(document.querySelector('.show-loadout')){document.querySelector('.show-loadout .loadout-info').click();return;}if(state.screen==='settings')menus('pause');else if(['profile','leaderboard'].includes(state.screen)){if(profile){showLevels();void syncResults();}}else if(state.screen==='levels')showHome();else pause();return;}if(state.screen!=='play')return;
  if(e.key>='1'&&e.key<='9')select(Number(e.key)-1);if(e.key.toLowerCase()==='r')loadLevel(state.level);if(e.code==='Space'){e.preventDefault();pause();}
 });
 window.addEventListener('blur',()=>{if(state.drag)cancelDrag();});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state.screen==='play')pause();void appStorage.flush();}});window.addEventListener('online',()=>{void syncResults();void appStorage.flush();});
 window.MCBlockLaunch={getStatus:status,restart:()=>loadLevel(state.level),next:()=>loadLevel(state.level+1),playLevel:loadLevel,select,
 getDiagnostics:()=>({assets:Object.keys(assets.images),...status(),enemies:world.enemies.map(e=>({skin:e.skin,hp:e.hp,alive:e.alive,dead:!!e.dead,stationary:!!e.stationary,burningUntil:e.burningUntil||0,appearance:mobAppearance(e,world.time),x:e.body.position.x,y:e.body.position.y,facing:e.facing,walkDistance:e.walkDistance,turns:e.turns,behavior:e.behavior,pose:e.pose})),whiteParticles:renderer.particles.filter(p=>p.poof).length,
 drawSound:drawAudio.diagnostics(),preview:state.drag?[...(renderer.arc||[])]:[],backgroundPixels:world.rear.grid.count(),movingBackgroundPixels:0,terrainPixels:world.grid.count(),debrisPixels:world.debris.reduce((n,e)=>n+(e.dead?0:e.count),0),
 music:music.diagnostics(),sound:{...assets.audioStats,enabled:assets.soundOn,volume:assets.soundVolume,played:{...assets.audioStats.played}},physicsParts:window.Matter.Composite.allBodies(world.engine.world).reduce((n,b)=>n+b.parts.length,0)})};
 requestAnimationFrame(frame);
}
start().catch(error=>{loadState.hidden=false;loadState.classList.add('error');loadState.textContent=`游戏未能启动：${error.message}`;console.error(error);});
