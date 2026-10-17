/* MC Block Launch v0.3 · 16x16 destructible pixels + optional local Matter.js rigid-body engine. */
'use strict';
(() => {
const CW=1280,CH=720,S=5,GW=CW/S,GH=CH/S,GROUND=112,BLOCK=16,GRAV=700,FIXED=1/120;
const canvas=document.querySelector('#stage'),ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const $=s=>document.querySelector(s);const UI={level:$('#levelTitle'),desc:$('#levelDesc'),ammo:$('#ammo'),targets:$('#targets'),destroyed:$('#destroyed'),bar:$('#ballbar'),result:$('#result'),resultFlag:$('#resultFlag'),resultTitle:$('#resultTitle'),resultMsg:$('#resultMsg'),next:$('#nextBtn'),hint:$('#gamehint'),sound:$('#soundToggle'),pause:$('#pause')};
const COL={sky:'#a4d3e3',mountain:'#91b9b4'};
const MATERIAL={
  0:{name:'空气',hard:0,density:0,palette:['#000000']},
  1:{name:'草',hard:9,density:1,palette:['#4e9d47','#5cae4c','#438941','#65b54e','#327a39','#7fc75c']},
  2:{name:'泥土',hard:16,density:1.3,palette:['#986c49','#795737','#8a5d3c','#a77b51','#64492d','#bd8c5d']},
  3:{name:'石头',hard:46,density:3.3,palette:['#858993','#a0a4a7','#707580','#666e78','#babcc2','#939699']},
  4:{name:'橡木',hard:28,density:1.5,palette:['#ac7943','#986531','#c19456','#d0a569','#875729','#e2b37c']},
  5:{name:'石砖',hard:52,density:3,palette:['#8e949c','#78818a','#b0b6bb','#656f78','#939ba6','#b6b3ae']},
  6:{name:'玻璃',hard:8,density:.65,palette:['#e6f6f8','#b6dfe5','#d2ecf0','#8ac8d5','#f6ffff']},
  7:{name:'基岩',hard:1e9,density:1e4,palette:['#32353b','#46474c','#292e34','#5a595d']},
  8:{name:'树叶',hard:9,density:.35,palette:['#438a48','#2f7a43','#57a653','#74b861','#376c39']},
  9:{name:'矿石',hard:53,density:3.6,palette:['#7b808a','#858c94','#ccb159','#e5c566','#7a7773']},
  10:{name:'木板',hard:24,density:1.2,palette:['#c49b61','#a9824b','#d2b077','#946f44','#e0ba87']},
  11:{name:'深板岩',hard:68,density:4.2,palette:['#4d5661','#353e48','#626974','#707880','#444c59']}
};
const BALLS=[
{id:'cobble',label:'圆石',short:'石',color:'#a5a5a5',mass:4,r:34,detail:'方形碰撞 · 砸出像素缺口',sprite:'cobblestone'},
{id:'tnt',label:'TNT',short:'T',color:'#e46053',mass:2,r:33,detail:'方块炸药 · 爆炸破坏',sprite:'tnt_side'},
{id:'ender',label:'末影珍珠',short:'末',color:'#33ae9e',mass:1.1,r:13,detail:'可穿透不超过 16 格像素的墙',sprite:'ender_pearl'},
{id:'blackhole',label:'黑洞',short:'●',color:'#6540aa',mass:1.5,r:16,detail:'附着表面 · 持续吸入周围的方块',sprite:null}
];
const SPRITE_NAMES=['cobblestone','tnt_side','ender_pearl','oak_log','oak_planks','stone_bricks','stone','dirt','grass_block_side','grass_block_top','obsidian','glass','bedrock','oak_leaves','iron_ore','deepslate','pillager','zombie'];
const sprites={};const sampledColors={};
const zombieTextureData='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAclBMVEUAAAAAzMyPj495nGVxlVtvlVxtlVtnkFYAr69ph1Z6d3cAqKgAnp5ae0gAmZlra2tXdUdOezZhYWFIdTJJcTVWScwAf39KaS0+aS07Yi9MTExGOqU2WiUAaGg4UiYAW1s/Pz86MYkwKHImIVsoKCgaGho5R/XAAAAAAXRSTlMAQObYZgAAAkJJREFUeNrtk2FzmzAMhpPNm+0akmjVqFRGEsPy///iXtnlml27laRfeWwswZ0eI3NsZkRFVWwUdHMrIqzKitKC3C4gVjhgOQLVOwQEAcvdAmViwZQiuKOFsj2J3i1gZWEVrAqEbxaIlkHMAni5QK15VRSpwTI/UFuYFnx/q2ZCQYyMEq5PSKWMJW8gZSv//av75rneqcJFxMqLemdiiq1zLraR6llimEtk2fdnpvZycfFyaeGScggkqKclLQjqWShG1RhR/XIKCEgWtCByLJs96tOTPiIROoogMhEvO0QWqf+AWqXdsQIEWfhP/AS/wXy//VXYji/Mz8N2G5iIPxYcC28EW0CsnxOwqnyqhTf/yQhy3/fjNE096Lru1CRl0dR0oGlSCAn5bteZYI7vCcYiGIYuhUa1CQH5kFIAVRbAHP8S9FeCoQhC2XgAKSDB8h9BroIMQc79aRhOwQwoqzkyTMt3Ke3m+CrIVWAxwzacTiZIRQBCgwyXgAgEtGAzk/tcdh6R2ETNkEyAOSCfBcykLjovyuy9j68CVPUAS4lWZB3AkQa8b1WlJMzqW9eykvhD9O8IkM1foR5Bg3wwlzlQJ967loQ0Ru+vD7EKMjJggnJsuKosYZpA2TsXiVnjdQvnsxVa+fm8B93QdbanlRUBkoBFWMk574RF/PUbPJ9R+OVhj/BsgnEap1xIoZsmyO1EcyYI0IFXQTz4+CoA+4f93uIPAMHYF3JTcyRokkmodbFVEo6HeNisrKysrKysrPyDP68WY0lh7YK7AAAAAElFTkSuQmCC';
function loadSprites(){return Promise.all(SPRITE_NAMES.map(n=>new Promise(resolve=>{const im=new Image();im.onload=()=>{sprites[n]=im;if(im.width===16&&im.height===16){try{const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);sampledColors[n]=x.getImageData(0,0,16,16).data;}catch(e){}}resolve();};im.onerror=resolve;im.src=n==='zombie'?zombieTextureData:'assets/textures/'+n+'.png';}))).then(()=>{state.dirty=true;drawGridImage();});}
const materialSprites={1:'grass_block_side',2:'dirt',3:'stone',4:'oak_log',5:'stone_bricks',6:'glass',7:'bedrock',8:'oak_leaves',9:'iron_ore',10:'oak_planks',11:'deepslate'};
const LEVELS=[
{title:'01 / 草地小屋',desc:'拆掉两名守卫藏身的木屋',kind:'hut',shots:7,mobs:2,seed:104},
{title:'02 / 石头哨塔',desc:'打断承重柱，挑战高处的守卫',kind:'tower',shots:7,mobs:3,seed:203},
{title:'03 / 双子木楼',desc:'两栋相连的房屋，结构会连锁坍塌',kind:'double',shots:7,mobs:3,seed:310},
{title:'04 / 掠夺者前哨站',desc:'击倒悬空平台上的全部守卫',kind:'outpost',shots:8,mobs:4,seed:414},
{title:'05 / 像素要塞',desc:'石砖、玻璃与高塔组成的最终试验场',kind:'castle',shots:9,mobs:5,seed:522}
];
const state={grid:new Uint8Array(GW*GH),hp:new Float32Array(GW*GH),dynamic:[],particles:[],projectiles:[],vortices:[],enemies:[],level:0,shots:6,selected:0,removed:0,lastShot:-100,drag:false,dragX:0,dragY:0,dragStartX:0,dragStartY:0,paused:false,ended:false,t:0,seed:0,shake:0,effects:[],dirty:true,armKick:0};
let soundOn=true,audioCtx=null,noiseBuffer=null;
const sounds={};for(const n of ['dirt','grass','stone','deepslate','glass','wood_like']){const a=new Audio('assets/sfx/'+n+'.ogg');a.preload='auto';sounds[n]=a;}
function audio(type='stone',volume=.23){if(!soundOn)return;try{let sound=sounds[type]||sounds.stone;const a=sound.cloneNode();a.volume=Math.min(.65,volume);a.play().catch(()=>{});}catch(_){}}
function boomSound(){if(!soundOn)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();const sr=audioCtx.sampleRate;const len=Math.floor(sr*.45);const buf=audioCtx.createBuffer(1,len,sr),ch=buf.getChannelData(0);for(let i=0;i<len;i++){let t=i/sr;ch[i]=(Math.random()*2-1)*Math.pow(1-t/.45,3)*.45;}let src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();src.buffer=buf;filter.type='lowpass';filter.frequency.setValueAtTime(1700,audioCtx.currentTime);filter.frequency.exponentialRampToValueAtTime(90,audioCtx.currentTime+.4);src.connect(filter).connect(gain).connect(audioCtx.destination);gain.gain.value=.85;src.start();}catch(_){audio('deepslate',.4);}}
function rng32(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let x=Math.imul(seed^seed>>>15,1|seed);x^=x+Math.imul(x^x>>>7,61|x);return ((x^x>>>14)>>>0)/4294967296;};}
function hash(a,b,c=0){let n=Math.imul(a+113,374761393)^Math.imul(b+293,668265263)^Math.imul(c+17,2246822519);n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;}
const idx=(x,y)=>y*GW+x,inside=(x,y)=>x>=0&&x<GW&&y>=0&&y<GH;
function material(x,y){x=Math.floor(x);y=Math.floor(y);return inside(x,y)?state.grid[idx(x,y)]:0;}
function cellAt(wx,wy){return material(wx/S,wy/S);}
function put(x,y,m){if(!inside(x,y))return;const k=idx(x,y);state.grid[k]=m;state.hp[k]=m?MATERIAL[m].hard:0;state.dirty=true;}
function rectangle(x,y,w,h,m){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,m);}
function hollow(x,y,w,h,thick,wall,roof,base){rectangle(x,y,w,thick,roof);rectangle(x,y+h-thick,w,thick,base);rectangle(x,y,thick,h,wall);rectangle(x+w-thick,y,thick,h,wall);}
function textureColor(m,x,y,seed=0){const p=MATERIAL[m].palette;let h=hash(x%16,y%16,seed+m*23);
const key=materialSprites[m];const data=sampledColors[key];if(data){let t=((y&15)*16+(x&15))*4;if(data[t+3]>=128){let out=[data[t],data[t+1],data[t+2]].map(v=>v.toString(16).padStart(2,'0')).join('');return '#'+out;}}
if(m===1 && y%16<3)return ['#89d46b','#72c55a','#9adc7d'][h%3];if(m===4||m===10){if(y%16===0||y%16===15)return '#7b552e';if(x%16===0)return '#93693c';if(y%16%6===0)return '#b6894d';}if(m===5&&((y%16===0)||((y%16===8)&&(x%16<1))))return '#545a63';if(m===6&&((x+y)%16===0||x%16===0||y%16===0))return '#7aafba';if(m===9&&h%13<3)return '#dfc251';return p[h%p.length];}
const terrainCanvas=document.createElement('canvas');terrainCanvas.width=GW;terrainCanvas.height=GH;const terrainCtx=terrainCanvas.getContext('2d');
function drawGridImage(){const im=terrainCtx.createImageData(GW,GH),d=im.data;for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){let m=material(x,y);if(!m)continue;const c=textureColor(m,x,y);let rr=parseInt(c.slice(1,3),16),gg=parseInt(c.slice(3,5),16),bb=parseInt(c.slice(5,7),16);let k=(y*GW+x)*4;d[k]=rr;d[k+1]=gg;d[k+2]=bb;d[k+3]=255;}terrainCtx.putImageData(im,0,0);state.dirty=false;}
// The map is composed EXCLUSIVELY of complete, aligned 16x16 Minecraft tiles.
// Destruction operates on their constituent 16x16 logical pixels (5 screen px each).
function tile(x,y,m){if(x%BLOCK||y%BLOCK)throw new Error(`Tile not aligned: ${x},${y}`);rectangle(x,y,BLOCK,BLOCK,m);}
function tileRow(x0,x1,y,m){for(let x=x0;x<=x1;x+=BLOCK)tile(x,y,m);}
function tileColumn(x,y0,y1,m){for(let y=y0;y<=y1;y+=BLOCK)tile(x,y,m);}
function addGround(seed){
 // No curves or non-block stair heights. Every material begins as an intact block.
 for(let x=0;x<GW;x+=BLOCK){
   tile(x,GROUND,1);
   tile(x,GROUND+BLOCK,2);
 }
}
function addTree(x,top=48){
 // Vanilla oak silhouette: single upright trunk with blocky, staggered leaf canopy.
 x=Math.floor(x/BLOCK)*BLOCK; top=Math.floor(top/BLOCK)*BLOCK;
 tileColumn(x,top+16,GROUND-16,4);
 const canopy=[[-2,1],[-1,0],[0,0],[1,0],[2,1]];
 for(let dy=0;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   if((dy===0&&Math.abs(dx)===2)||(dy===2&&Math.abs(dx)===2))continue;
   let tx=x+dx*16,ty=top+dy*16;
   if(tx>=0&&tx<GW&&!(dx===0&&dy===2))tile(tx,ty,8);
 }
}
function addEnemy(x,y,kind='pillager'){state.enemies.push({x:x*S,y:y*S-33,vx:0,vy:0,r:14,alive:true,dying:false,life:100,type:kind,rotation:0,hits:0});}
// Minecraft villages are built from complete 16x16 block units, including roofs.
// Empty interior spaces are intentional: separate columns and floors can break and fall.
function addRoof(x,y,width,m=10){
 tileRow(x,x+width-16,y+16,m);
 tileRow(x+16,x+width-32,y,m);
}
function stageHut(){
 const x=144;addRoof(x,48,96,10);
 for(const a of [x+16,x+64])tileColumn(a,80,96,4);
 tile(x+16,80,6);tile(x+64,80,6);
 tileRow(x+16,x+64,96,10);
 addEnemy(x+48,GROUND,'zombie');addEnemy(x+80,GROUND,'pillager');
}
function stageTower(){
 const x=160;tileRow(x,x+96,16,5);tileRow(x+16,x+80,32,10);
 tileColumn(x+16,48,96,5);tileColumn(x+80,48,96,5);
 tileRow(x+32,x+64,80,10);tile(x+16,64,6);
 addEnemy(x+48,32,'pillager');addEnemy(x+64,80,'zombie');addEnemy(x+48,GROUND,'pillager');
}
function stageDouble(){
 addRoof(96,64,80,10);tileColumn(112,96,96,4);tileColumn(160,96,96,4);
 addRoof(192,32,64,5);tileColumn(208,64,96,5);tileColumn(240,64,96,5);
 tileRow(176,192,80,10);tile(112,96,6);tile(240,80,6);
 addEnemy(144,GROUND,'zombie');addEnemy(224,GROUND,'pillager');addEnemy(224,48,'pillager');
}
function stageOutpost(){
 // Inspired by the recognizable silhouette of a vanilla pillager outpost.
 tileRow(144,240,16,10);tileRow(160,224,32,10);
 tileColumn(160,48,96,4);tileColumn(224,48,96,4);
 tileRow(176,208,64,10);tileRow(176,208,96,10);
 tile(160,64,4);tile(224,64,4);
 addEnemy(192,32,'pillager');addEnemy(208,32,'pillager');addEnemy(192,80,'pillager');addEnemy(208,GROUND,'pillager');
}
function stageCastle(){
 tileColumn(128,48,96,5);tileColumn(240,48,96,5);
 tileRow(144,224,48,5);tileRow(144,224,96,5);
 tile(160,80,6);tile(208,80,6);
 tileRow(128,160,32,5);tileRow(208,240,32,5);
 for(const x of [128,160,208,240])tile(x,16,5);
 addEnemy(144,32,'pillager');addEnemy(224,32,'pillager');addEnemy(176,48,'zombie');addEnemy(208,48,'pillager');addEnemy(176,96,'zombie');
}
function initLevel(n){state.seed=LEVELS[n].seed;state.grid.fill(0);state.hp.fill(0);state.dynamic=[];state.particles=[];state.projectiles=[];state.vortices=[];state.enemies=[];resetPhysics();state.effects=[];state.t=0;state.shake=0;state.removed=0;state.shots=LEVELS[n].shots;state.level=n;state.ended=false;state.drag=false;state.lastShot=-100;state.armKick=0;state.paused=false;state.dirty=true;state.needRebuild=false;state.lastRebuild=0;noTargetsAt=0;const l=LEVELS[n];addGround(state.seed);if(l.kind==='hut')stageHut();if(l.kind==='tower')stageTower();if(l.kind==='double')stageDouble();if(l.kind==='outpost')stageOutpost();if(l.kind==='castle')stageCastle();if(n===0)addTree(240,64);if(n===1)addTree(112,64);if(n===2)addTree(240,64);if(n===3)addTree(240,64);if(n===4)addTree(0,64);UI.result.classList.add('hidden');UI.hint.textContent='拖动投石车上方的弹药向左拉，松手发射';updateHUD();drawGridImage();}
function updateHUD(){const l=LEVELS[state.level];UI.level.textContent=l.title;UI.desc.textContent=l.desc;UI.ammo.textContent=state.shots;UI.targets.textContent=state.enemies.filter(e=>e.alive).length;UI.destroyed.textContent=state.removed.toLocaleString();Array.from(UI.bar.children).forEach((b,i)=>b.classList.toggle('selected',i===state.selected));UI.pause.textContent=state.paused?'▶ 继续':'Ⅱ 暂停';}
function spawnFragments(x,y,m,count=1,force=1){if(state.particles.length>900)return;let c=textureColor(m,Math.floor(x/S),Math.floor(y/S));for(let i=0;i<count;i++){let a=Math.random()*Math.PI*2,s=(45+Math.random()*100)*force;state.particles.push({x:x+Math.random()*S,y:y+Math.random()*S,vx:Math.cos(a)*s,vy:Math.sin(a)*s-45,color:c,size:2+Math.random()*3,life:1.1+Math.random()*1.1,total:2.2});}}
function deletePixel(x,y,impulse=1){if(!inside(x,y))return;let k=idx(x,y),m=state.grid[k];if(!m||m===7)return;state.grid[k]=0;state.hp[k]=0;state.dirty=true;state.removed++;if(Math.random()<.22)spawnFragments((x+.3)*S,(y+.3)*S,m,1,impulse);}
function damageRegion(cx,cy,radius,strength,explosion=false){let minX=Math.max(0,Math.floor((cx-radius)/S)),maxX=Math.min(GW-1,Math.ceil((cx+radius)/S)),minY=Math.max(0,Math.floor((cy-radius)/S)),maxY=Math.min(GH-1,Math.ceil((cy+radius)/S));let destroyed=0;
for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){let k=idx(x,y),m=state.grid[k];if(!m||m===7)continue;let dx=(x+.5)*S-cx,dy=(y+.5)*S-cy,dist=Math.hypot(dx,dy),jag=.91+(hash(x,y,state.seed)%100)/560;let radiusScale=explosion?jag:1;if(dist>radius*radiusScale)continue;let attenuation=explosion?Math.max(.07,1-Math.pow(dist/radius,1.8)):.6+.4*(1-dist/radius);state.hp[k]-=strength*attenuation;
if(state.hp[k]<=0){deletePixel(x,y,explosion?2:1.1);destroyed++;}}
for(const body of state.dynamic)damageBody(body,cx,cy,radius,strength,explosion);
state.dynamic=state.dynamic.filter(b=>b.count>0);if(destroyed>0)state.needRebuild=true;return destroyed;}
// Matter.js is vendored with the game. The grid owns destructibility;
// Matter manages separated large fragments as true rectangle rigid bodies.
const Matter2D=window.Matter||null;let engine=null,world=null;
function resetPhysics(){if(!Matter2D)return;engine=Matter2D.Engine.create({gravity:{x:0,y:1,scale:.001}});world=engine.world;Matter2D.Composite.add(world,[Matter2D.Bodies.rectangle(CW/2,GROUND*S+62,CW*3,125,{isStatic:true,friction:.9}),Matter2D.Bodies.rectangle(-180,CH/2,300,CH*4,{isStatic:true})]);}
function withMatter(body){if(!Matter2D||!world)return body;const o=Matter2D.Bodies.rectangle(body.x,body.y,Math.max(5,body.w*S),Math.max(5,body.h*S),{friction:.75,frictionStatic:1,restitution:.08,density:.00018,angle:body.rot});Matter2D.Body.setVelocity(o,{x:body.vx/60,y:body.vy/60});Matter2D.Body.setAngularVelocity(o,body.omega/60);Matter2D.Composite.add(world,o);body.mb=o;return body;}
function makeBody(pixels,vx=0,vy=0,omega=0){if(!pixels.length)return null;let minX=GW,minY=GH,maxX=0,maxY=0,mass=0;for(const p of pixels){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);mass+=MATERIAL[p.m].density;}const w=maxX-minX+1,h=maxY-minY+1,mask=new Uint8Array(w*h);let data=new Uint8ClampedArray(w*h*4);for(const p of pixels){let local=(p.y-minY)*w+(p.x-minX);mask[local]=p.m;let c=textureColor(p.m,p.x,p.y),k=local*4;data[k]=parseInt(c.slice(1,3),16);data[k+1]=parseInt(c.slice(3,5),16);data[k+2]=parseInt(c.slice(5,7),16);data[k+3]=255;}
const pic=document.createElement('canvas');pic.width=w;pic.height=h;pic.getContext('2d').putImageData(new ImageData(data,w,h),0,0);
const edge=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){let k=y*w+x;if(!mask[k])continue;if(y===h-1||x===0||x===w-1||!mask[k+1]||!mask[k+w]||!mask[k-1])edge.push({x:(x-w/2+.5)*S,y:(y-h/2+.5)*S});}const stride=Math.max(1,Math.floor(edge.length/96));return withMatter({x:(minX+(w/2))*S,y:(minY+h/2)*S,vx,vy,rot:0,omega,mask,pic,w,h,count:pixels.length,mass:Math.max(1,Math.min(190,mass/15)),edge:edge.filter((_,i)=>i%stride===0),idle:0});}
function componentDetach(){// Flood fill only structural pixels above the terrain. Never detach the anchored ground.
const seen=new Uint8Array(GW*GROUND),grid=state.grid;let attached=[],count=0;
for(let y=14;y<GROUND;y++)for(let x=40;x<GW;x++){let start=idx(x,y);if(seen[start]||!grid[start])continue;let queue=[start],q=0,component=[],sumX=0,supportMin=999,supportMax=-1;
seen[start]=1;while(q<queue.length){let k=queue[q++],cx=k%GW,cy=Math.floor(k/GW),m=grid[k];component.push({x:cx,y:cy,m});sumX+=cx;
if(cy===GROUND-1&&material(cx,GROUND)) {supportMin=Math.min(supportMin,cx);supportMax=Math.max(supportMax,cx);}
for(const [nx,ny] of [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]]){if(nx<40||nx>=GW||ny<0||ny>=GROUND)continue;let nk=idx(nx,ny);if(!seen[nk]&&grid[nk]){seen[nk]=1;queue.push(nk);}}}
if(!component.length)continue;
// A structure supported by one narrow remaining column will tip under its own center of mass.
const center=sumX/component.length;const supported=supportMax>=0;const unstable=supported&&(center<supportMin-4||center>supportMax+4);
// Tiny decorative leaf fragments decay as particles rather than creating thousands of rigid bodies.
if(!supported||unstable){let actual=component.filter(p=>p.m!==7);if(!actual.length)continue;for(const p of actual){let k=idx(p.x,p.y);grid[k]=0;state.hp[k]=0;}
const fall=makeBody(actual,unstable?(center<(supportMin+supportMax)/2?-20:20):0,25,unstable?(center<(supportMin+supportMax)/2?-.25:.25):Math.random()*.3-.15);if(fall){if(actual.length<7){for(const p of actual)spawnFragments(p.x*S,p.y*S,p.m,1,.4);}else if(state.dynamic.length<48)state.dynamic.push(fall);}state.dirty=true;count++;}
}
state.needRebuild=false;return count;}
function refreshBodyEdges(body){const edges=[];for(let gy=0;gy<body.h;gy++)for(let gx=0;gx<body.w;gx++){let k=gy*body.w+gx;if(!body.mask[k])continue;if(gy===body.h-1||gx===0||gx===body.w-1||!body.mask[k+1]||!body.mask[k+body.w]||!body.mask[k-1])edges.push({x:(gx-body.w/2+.5)*S,y:(gy-body.h/2+.5)*S});}const stride=Math.max(1,Math.floor(edges.length/96));body.edge=edges.filter((_,i)=>i%stride===0);}
function damageBody(body,cx,cy,radius,strength,explosion){const ca=Math.cos(body.rot),sa=Math.sin(body.rot),dx=cx-body.x,dy=cy-body.y,localX=(dx*ca+dy*sa)/S+body.w/2,localY=(-dx*sa+dy*ca)/S+body.h/2;let changed=false;
for(let gy=Math.max(0,Math.floor(localY-radius/S-1));gy<Math.min(body.h,Math.ceil(localY+radius/S+1));gy++)for(let gx=Math.max(0,Math.floor(localX-radius/S-1));gx<Math.min(body.w,Math.ceil(localX+radius/S+1));gx++){let k=gy*body.w+gx,m=body.mask[k];if(!m||m===7)continue;let dd=Math.hypot((gx+.5-localX)*S,(gy+.5-localY)*S);if(dd>radius*(explosion?.94:1))continue;let hard=MATERIAL[m].hard,threshold=strength*(explosion?Math.max(.1,1-dd/radius):.72);if(threshold<hard*.65)continue;body.mask[k]=0;body.count--;state.removed++;const pix=body.pic.getContext('2d');pix.clearRect(gx,gy,1,1);if(Math.random()<.24)spawnFragments(cx,cy,m,1,1);changed=true;}
if(changed){refreshBodyEdges(body);body.vx+=(body.x-cx)*.035;body.vy-=70;body.omega+=Math.max(-.6,Math.min(.6,(cx-body.x)*.002));body.mass=Math.max(1,body.mass*.98);if(body.mb)Matter2D.Body.applyForce(body.mb,body.mb.position,{x:(body.x-cx)*.00008,y:-.005});}
}
function explosion(x,y,r=75,power=90){state.effects.push({x,y,r,life:.35});state.shake=Math.max(state.shake,13);damageRegion(x,y,r,power,true);for(const e of state.enemies)if(e.alive){let d=Math.hypot(e.x-x,e.y-y);if(d<r+35){e.vx+=(e.x-x)/(d||1)*Math.max(0,(r+35-d))*5;e.vy-=(r+35-d)*4;if(d<r*.85)hurtEnemy(e,135,'爆炸');}}
for(const b of state.dynamic){let d=Math.hypot(b.x-x,b.y-y);if(d<r+Math.max(b.w,b.h)*S/2){b.vx+=(b.x-x)/(d||1)*230;b.vy-=140;b.omega+=(b.x>x?1:-1)*.9;if(b.mb)Matter2D.Body.applyForce(b.mb,b.mb.position,{x:(b.x-x)*.00008,y:-.006});}}
for(let i=0;i<140;i++){let a=Math.random()*Math.PI*2,s=Math.random()*280+45;state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-80,color:['#ffcf75','#f6a85b','#86828d','#f8e4ab'][i%4],size:2+Math.random()*6,life:.3+Math.random()*1.1,total:1});}boomSound();}
function hurtEnemy(e,energy,reason){if(!e.alive)return;if(energy<35)return;e.life-=energy;state.effects.push({x:e.x,y:e.y-15,r:13,life:.2,flash:true});if(e.life<=0){e.alive=false;e.dying=true;e.vy=-90;e.vx+=40*(Math.random()-.5);audio('glass',.3);for(let i=0;i<22;i++)spawnFragments(e.x,e.y,8,1,1.2);updateHUD();}}
function squareNear(px,py,half,prevX=px,prevY=py){
 // An axis-aligned square is scanned against actual surviving material pixels.
 // This is not a circular perimeter sample: terrain holes remain physically open.
 if(px-half<0||px+half>=CW||py-half<0||py+half>=CH)
  return {hit:true,nx:px-half<0?1:px+half>=CW?-1:0,ny:py-half<0?1:py+half>=CH?-1:0,m:3};
 const x0=Math.max(0,Math.floor((px-half)/S)),x1=Math.min(GW-1,Math.floor((px+half)/S));
 const y0=Math.max(0,Math.floor((py-half)/S)),y1=Math.min(GH-1,Math.floor((py+half)/S));
 let best=null;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  let m=material(x,y);if(!m)continue;
  const left=x*S,right=left+S,top=y*S,bottom=top+S;
  const overlapX=Math.min(px+half,right)-Math.max(px-half,left);
  const overlapY=Math.min(py+half,bottom)-Math.max(py-half,top);
  if(overlapX<=0||overlapY<=0)continue;
  let nx=0,ny=0,depth=0;
  if(prevY+half<=top+0.01){ny=-1;depth=overlapY;}
  else if(prevY-half>=bottom-0.01){ny=1;depth=overlapY;}
  else if(prevX+half<=left+0.01){nx=-1;depth=overlapX;}
  else if(prevX-half>=right-0.01){nx=1;depth=overlapX;}
  else if(overlapX<overlapY){nx=px<(left+right)/2?-1:1;depth=overlapX;}
  else {ny=py<(top+bottom)/2?-1:1;depth=overlapY;}
  // Prioritize contact nearest the leading face, not an arbitrary corner.
  const score=depth+((nx!==0&&Math.abs(px-prevX)<.01)||(ny!==0&&Math.abs(py-prevY)<.01)?2:0);
  if(!best||score<best.score)best={hit:true,nx,ny,m,score};
 }
 return best||{hit:false,nx:0,ny:0,m:0};
}
function hitBodyAt(b,px,py,half){
 const cs=Math.cos(b.rot),sn=Math.sin(b.rot),ex=half*(Math.abs(cs)+Math.abs(sn));
 if(Math.abs(px-b.x)>b.w*S/2+ex||Math.abs(py-b.y)>b.h*S/2+ex)return false;
 // Square collision proxy on the rotated pixel mask of a fallen building.
 for(let oy=-half;oy<=half;oy+=Math.max(4,S))for(let ox=-half;ox<=half;ox+=Math.max(4,S)){
  const wx=px+ox,wy=py+oy,dx=wx-b.x,dy=wy-b.y;
  const ix=Math.floor((dx*cs+dy*sn)/S+b.w/2),iy=Math.floor((-dx*sn+dy*cs)/S+b.h/2);
  if(ix>=0&&iy>=0&&ix<b.w&&iy<b.h&&b.mask[iy*b.w+ix])return true;
 }
 return false;
}
function playHitSound(m,power){if(m===6)audio('glass',.25);else if(m===4||m===10)audio('wood_like',.21);else if(m===1||m===2||m===8)audio('dirt',.20);else if(m===5||m===11)audio('deepslate',.22);else audio('stone',.2);}
function applyImpact(p,hit,body=null){const speed=Math.hypot(p.vx,p.vy),id=p.kind.id,energy=speed*Math.sqrt(p.kind.mass);if(state.t-p.lastImpact<.04&&id!=='drill')return;
p.lastImpact=state.t; if(id==='tnt'){explosion(p.x,p.y,87,142);p.dead=true;return;}

if(id==='ender'&&p.uses===0){
// March through the impacted surface, stopping at the first genuinely free pixel.
// 16 logical material cells = 80 screen pixels; thicker walls block teleportation.
const dir=p.vx>=0?1:-1,origin=p.x,cy=p.y,limit=16*S;let exit=null,passed=0;
for(let d=6;d<=limit+20;d+=S){let xx=origin+dir*d;
if(cellAt(xx,cy)||cellAt(xx,cy-8)||cellAt(xx,cy+8)){passed=d;continue;}
if(passed>0&&d-passed>=15){exit=xx;break;}}
if(exit!==null&&passed<=limit){state.effects.push({x:p.x,y:p.y,r:30,life:.3,portal:true});p.x=exit+dir*16;p.vx*=.91;p.uses++;state.effects.push({x:p.x,y:p.y,r:35,life:.3,portal:true});audio('glass',.22);return;}
}
if(id==='blackhole'){p.dead=true;state.vortices.push({x:p.x,y:p.y,age:0,life:3.2,r:107});audio('deepslate',.34);return;}
const intensity=id==='cobble'?2.45:1.0;const radius=id==='cobble'?27:15;const power=Math.min(130,Math.max(14,energy*.14*intensity));if(body){damageBody(body,p.x,p.y,radius,power,false);body.vx+=p.vx*Math.min(.16,12/body.mass);body.vy+=p.vy*Math.min(.16,12/body.mass);body.omega+=(p.x-body.x)*.003/(1+body.mass*.03);}else{damageRegion(p.x,p.y,radius,power,false);}
state.shake=Math.max(state.shake,id==='cobble'?5:2);playHitSound(hit.m,power);
const dot=p.vx*hit.nx+p.vy*hit.ny;
 if(dot<0){
  const rest=id==='cobble'?.16:.24;
  p.vx-=(1+rest)*dot*hit.nx;
  p.vy-=(1+rest)*dot*hit.ny;
 }
 p.vx*=hit.ny<-.5?.67:.79;
 // Cubes stop when supported, rather than jittering, rotating or sinking forever.
 if(hit.ny<-.5&&Math.abs(p.vy)<55&&Math.abs(p.vx)<85){
  p.resting=true;p.vx=0;p.vy=0;p.spin=0;p.rot=Math.round(p.rot/(Math.PI/2))*(Math.PI/2);
 } else {
  p.spin*=.75;
  p.x+=hit.nx*1.2;p.y+=hit.ny*1.2;
 }

}
function updateProjectiles(dt){
for(const p of state.projectiles){
 if(p.dead)continue;p.age+=dt;
 if(p.age>18||p.y>CH+110||p.x>CW+110||p.x<-80){p.dead=true;continue;}
 if(p.resting){
  // An excavated surface can vanish under a resting cube; then it falls again.
  const footY=p.y+p.r+2;
  const hasSupport=[-.7,0,.7].some(f=>cellAt(p.x+p.r*f,footY)!==0);
  if(!hasSupport){p.resting=false;p.vy=15;}else continue;
 }
 p.vy+=GRAV*dt;
 let steps=Math.min(15,Math.max(1,Math.ceil(Math.hypot(p.vx,p.vy)*dt/3)));
 for(let j=0;j<steps&&!p.dead;j++){
  let prevX=p.x,prevY=p.y;
  p.x+=p.vx*dt/steps;p.y+=p.vy*dt/steps;
  for(const e of state.enemies){
   if(!e.alive)continue;
   if(Math.abs(p.x-e.x)<p.r+e.r&&Math.abs(p.y-(e.y-10))<p.r+25){
    const energy=p.kind.mass*Math.hypot(p.vx-e.vx,p.vy-e.vy)*.27;
    hurtEnemy(e,energy,'弹药');e.vx+=p.vx*.12;e.vy+=p.vy*.07;
    p.vx*=-.25;p.vy*=-.2;break;
   }
  }
  let collision=squareNear(p.x,p.y,p.r,prevX,prevY);
  let body=state.dynamic.find(b=>hitBodyAt(b,p.x,p.y,p.r));
  if(body&&!collision.hit){
   let dx=p.x-body.x,dy=p.y-body.y;
   collision={hit:true,nx:Math.abs(dx)>Math.abs(dy)?Math.sign(dx):0,ny:Math.abs(dx)>Math.abs(dy)?0:Math.sign(dy),m:5};
  }
  if(collision.hit){
   p.x=prevX;p.y=prevY;
   applyImpact(p,collision,body);
   if(p.kind.id==='tnt'||p.kind.id==='blackhole'||p.resting)break;
  }else{
   p.rot+=p.spin*dt/steps;
   p.spin*=.999;
  }
 }
}
state.projectiles=state.projectiles.filter(p=>!p.dead);
}
function supportPixel(px,py){for(let dx=-9;dx<=9;dx+=5)if(cellAt(px+dx,py+5))return true;return false;}
function updateEnemies(dt){for(const e of state.enemies){if(e.y>CH+80) {if(e.alive){e.alive=false;updateHUD();}continue;}if(!e.alive){e.vy+=GRAV*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;continue;}const supported=supportPixel(e.x,e.y+32);if(!supported){e.vy+=GRAV*dt;let lastVy=e.vy;e.x+=e.vx*dt;e.y+=e.vy*dt;if(supportPixel(e.x,e.y+32)&&lastVy>0){e.y=Math.floor((e.y+34)/S)*S-34;e.vy=0;if(lastVy>200)hurtEnemy(e,(lastVy-150)*.48,'坠落');}}else{e.vy=0;e.vx*=.8;}
for(const b of state.dynamic){if(b.count===0)continue;let reach=(Math.max(b.w,b.h)*S/2)+20;if(Math.hypot(b.x-e.x,b.y-e.y)<reach){if(hitBodyAt(b,e.x,e.y,e.r)){let rel=Math.hypot(b.vx-e.vx,b.vy-e.vy);if(rel>65)hurtEnemy(e,(rel-55)*Math.sqrt(b.mass)*.13,'残骸');e.vx+=b.vx*.1;e.vy+=b.vy*.1;}}}}
}
function updateBodies(dt){if(Matter2D&&engine){Matter2D.Engine.update(engine,dt*1000);for(const b of state.dynamic){if(!b.mb||b.count<=0)continue;b.x=b.mb.position.x;b.y=b.mb.position.y;b.rot=b.mb.angle;b.vx=b.mb.velocity.x*60;b.vy=b.mb.velocity.y*60;b.omega=b.mb.angularVelocity*60;if(b.x<-300||b.x>CW+300||b.y>CH+300){b.count=0;Matter2D.Composite.remove(world,b.mb);}}state.dynamic=state.dynamic.filter(b=>b.count>0);return;}
for(const b of state.dynamic){if(b.count<=0)continue;b.vy+=GRAV*dt;b.vx*=.999;b.omega*=.998;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.omega*dt;let ca=Math.cos(b.rot),sa=Math.sin(b.rot),contactCount=0,lowest=0;
for(const p of b.edge){const x=b.x+p.x*ca-p.y*sa,y=b.y+p.x*sa+p.y*ca;const mat=cellAt(x,y+2);if(mat){contactCount++;lowest=Math.max(lowest,(y+2)%S);}}
if(contactCount){b.y-=Math.max(1.4,Math.min(S*1.1,2+lowest));if(b.vy>110){b.vy=-b.vy*.13;state.shake=Math.max(state.shake,Math.min(5,b.mass*.08));if(b.mass>6)audio('deepslate',.07);}else b.vy=Math.min(0,b.vy*.1);
b.vx*=.83;b.omega*=.68;if(Math.abs(b.vy)<6&&Math.abs(b.omega)<.03){b.vy=0;b.omega=0;b.vx*=.4;b.idle+=dt;}else b.idle=0;
}else b.idle=0;
if(b.x<-250||b.x>CW+250||b.y>CH+260)b.count=0;
}state.dynamic=state.dynamic.filter(b=>b.count>0);}
function updateVortices(dt){for(const v of state.vortices){v.age+=dt;v.life-=dt;const R=v.r*(.96+.03*Math.sin(v.age*7));
// Different radius each step: scoop out pixels without deleting the entire circle at once.
if(v.age<2.75)damageRegion(v.x,v.y,Math.min(R,15+v.age*37),30,true);
for(const e of state.enemies){if(!e.alive)continue;const dx=v.x-e.x,dy=v.y-e.y,d=Math.hypot(dx,dy);if(d<R+20){e.vx+=dx/(d||1)*150*dt;e.vy+=dy/(d||1)*170*dt;if(d<25)hurtEnemy(e,120,'黑洞');}}
for(const b of state.dynamic){let dx=v.x-b.x,dy=v.y-b.y,d=Math.hypot(dx,dy);if(d<R+70){if(b.mb)Matter2D.Body.applyForce(b.mb,b.mb.position,{x:dx/(d||1)*.0009,y:dy/(d||1)*.0009});else{b.vx+=dx/(d||1)*340*dt;b.vy+=dy/(d||1)*340*dt;}}}
for(const q of state.particles){let dx=v.x-q.x,dy=v.y-q.y,d=Math.hypot(dx,dy);if(d<R){q.vx+=dx/(d||1)*700*dt;q.vy+=dy/(d||1)*700*dt;}}
if(v.age>.12&&Math.floor(v.age*7)!==Math.floor((v.age-dt)*7))audio('deepslate',.055);
}state.vortices=state.vortices.filter(v=>v.life>0);}
function updateParticles(dt){for(const p of state.particles){p.life-=dt;p.vy+=370*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.995;if(cellAt(p.x,p.y+3)&&p.vy>0){p.y-=Math.min(3,p.vy*dt);p.vy*=-.16;p.vx*=.65;}}state.particles=state.particles.filter(p=>p.life>0&&p.y<CH+10).slice(-900);for(const e of state.effects)e.life-=dt;state.effects=state.effects.filter(e=>e.life>0);}
let noTargetsAt=0;
function finishWin(won){state.ended=true;UI.result.classList.remove('hidden');UI.resultFlag.textContent=won?'任务完成':'任务失败';UI.resultTitle.textContent=won?'所有守卫已被击败':'弹药耗尽';UI.resultMsg.textContent=won?`本关击毁 ${state.removed.toLocaleString()} 个纹理像素。建筑还能继续塌一会儿。`:'调整发射角度，或者换一种弹药试试。';UI.next.textContent=state.level===LEVELS.length-1?'从头开始 ↻':'下一关 →';}
function update(dt){if(state.paused)return;state.t+=dt;state.armKick=Math.max(0,(state.armKick||0)-dt);if(!state.ended)updateProjectiles(dt);updateVortices(dt);updateBodies(dt);updateEnemies(dt);updateParticles(dt);state.shake*=.88;if(state.needRebuild&&state.t-(state.lastRebuild||0)>.08){componentDetach();state.lastRebuild=state.t;}
if(!state.ended){if(state.enemies.every(e=>!e.alive)){noTargetsAt+=dt;if(noTargetsAt>2.4)finishWin(true);}else noTargetsAt=0;}
if(state.shots===0&&state.projectiles.length===0&&state.t-state.lastShot>4&&!state.ended)finishWin(false);
if(state.dirty&&Math.floor(state.t*30)%2===0)drawGridImage();if(Math.floor(state.t*10)%5===0)updateHUD();}
function drawBackdrop(){
 ctx.fillStyle='#83b9ed';ctx.fillRect(0,0,CW,CH);
 // Old-style Minecraft cloud slabs: broad horizontal 16-pixel aligned sections.
 ctx.fillStyle='#ffffff';
 for(const [x,y] of [[96,96],[464,64],[800,112],[1088,80]]){
   ctx.fillRect(x,y,192,16);
   ctx.fillRect(x+32,y-16,128,16);
   ctx.fillRect(x+64,y+16,64,16);
 }
}
function drawObjects(){// Draw separated rigid pieces with nearest-neighbor pixel rendering and true rotations.
for(const b of state.dynamic){if(!b.count)continue;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot);ctx.imageSmoothingEnabled=false;ctx.drawImage(b.pic,-b.w*S/2,-b.h*S/2,b.w*S,b.h*S);ctx.restore();}
for(const e of state.enemies){if(e.y>CH+50)continue;ctx.save();ctx.translate(e.x,e.y);if(!e.alive)ctx.rotate(.5);drawEnemy(e);ctx.restore();}
for(const p of state.projectiles){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot||0);drawBall(0,0,p.kind,p.r);ctx.restore();}
for(const p of state.particles){ctx.globalAlpha=Math.min(1,p.life/.7);ctx.fillStyle=p.color;ctx.fillRect(Math.floor(p.x),Math.floor(p.y),p.size,p.size);}ctx.globalAlpha=1;
for(const v of state.vortices){ctx.save();let a=Math.min(1,v.life/.45);ctx.globalAlpha=a*.65;ctx.strokeStyle='#5f31c4';ctx.lineWidth=8;ctx.beginPath();ctx.arc(v.x,v.y,Math.min(v.r,15+v.age*37),state.t*1.2,state.t*1.2+Math.PI*1.65);ctx.stroke();ctx.globalAlpha=a;ctx.fillStyle='#090710';ctx.beginPath();ctx.arc(v.x,v.y,12+Math.sin(state.t*8)*3,0,Math.PI*2);ctx.fill();ctx.restore();}
for(const e of state.effects){ctx.save();ctx.globalAlpha=Math.min(.8,e.life*2);ctx.strokeStyle=e.portal?'#70f6f3':e.flash?'#fff1c0':'#ffb76a';ctx.lineWidth=e.portal?4:3;let t=1-e.life/(e.portal?.3:e.flash?.2:.35);ctx.beginPath();ctx.arc(e.x,e.y,Math.max(1,e.r*t),0,Math.PI*2);ctx.stroke();ctx.restore();}}
function drawEnemy(e){
 ctx.globalAlpha=e.alive?1:.45;
 const sheet=sprites[e.type==='zombie'?'zombie':'pillager'];
 if(sheet && sheet.width>=64){
   // Sample the real Minecraft entity skin atlas, not hand-drawn guards.
   // Head front (8,8,8,8), torso front (20,20,8,12), limbs front.
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(sheet,8,8,8,8,-16,-34,32,32);
   ctx.drawImage(sheet,20,20,8,12,-16,-2,32,24);
   ctx.drawImage(sheet,4,20,4,12,-13,22,12,14);
   ctx.drawImage(sheet,4,20,4,12,1,22,12,14);
   ctx.drawImage(sheet,44,20,4,12,-23,0,8,24);
   ctx.drawImage(sheet,44,20,4,12,15,0,8,24);
 }else{
   ctx.fillStyle=e.type==='zombie'?'#4b8f52':'#909e9b';ctx.fillRect(-16,-34,32,34);
   ctx.fillStyle=e.type==='zombie'?'#427bba':'#72503e';ctx.fillRect(-16,0,32,30);
 }
 ctx.globalAlpha=1;
}
function drawBall(x,y,ball,r=14){if(ball.id==='blackhole'){ctx.fillStyle='#1c1729';ctx.beginPath();ctx.arc(x,y,r+5+Math.sin(state.t*8)*2,0,6.283);ctx.fill();ctx.strokeStyle='#9465dc';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r+2,0,6.283);ctx.stroke();ctx.fillStyle='#07080b';ctx.beginPath();ctx.arc(x,y,r-3,0,6.283);ctx.fill();return;}
const im=sprites[ball.sprite];const d=ball.id==='ender'?r*2:r*2;
if(im){ctx.imageSmoothingEnabled=false;ctx.drawImage(im,x-d/2,y-d/2,d,d);}
else{ctx.fillStyle=ball.color;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.fillStyle='#ffffff88';ctx.fillRect(x-r,y-r,2*r,3);}}
const CANNON_X=195,CANNON_Y=461;
function drawLauncher(){
 // Functional catapult silhouette: two wheels, frame, triangular braces, axle,
 // counterweight and a lever holding the current launchable Minecraft item.
 const pivotX=158,pivotY=511,loadedX=CANNON_X,loadedY=CANNON_Y-13;
 ctx.save();
 const wooden='#86613c',dark='#3c3026',trim='#b88b53';
 // Wheels touch the exactly flat grass-block ground.
 for(const cx of [112,209]){
  ctx.fillStyle=dark;ctx.fillRect(cx-20,524,40,37);
  ctx.fillStyle='#634b30';ctx.fillRect(cx-15,529,30,26);
  ctx.fillStyle='#b89a71';ctx.fillRect(cx-9,534,18,16);
  ctx.fillStyle=dark;ctx.fillRect(cx-3,540,6,6);
 }
 ctx.fillStyle=wooden;ctx.fillRect(90,515,144,15);
 ctx.fillStyle=trim;ctx.fillRect(97,512,129,5);
 ctx.strokeStyle=dark;ctx.lineWidth=14;ctx.lineCap='square';
 ctx.beginPath();ctx.moveTo(110,519);ctx.lineTo(pivotX,pivotY-9);ctx.lineTo(214,519);ctx.stroke();
 ctx.strokeStyle=wooden;ctx.lineWidth=9;
 ctx.beginPath();ctx.moveTo(109,519);ctx.lineTo(pivotX,pivotY-9);ctx.lineTo(210,519);ctx.stroke();
 // The lever follows the dragged sling; after firing it swings and returns.
 let tipX=loadedX,tipY=loadedY;
 if(state.drag){tipX=state.dragX;tipY=state.dragY;}
 else if(state.armKick>0){const phase=1-state.armKick/.38,ang=-.98+Math.sin(Math.max(0,phase)*Math.PI)*1.05;tipX=pivotX+66*Math.cos(ang);tipY=pivotY+66*Math.sin(ang);}
 const dx=tipX-pivotX,dy=tipY-pivotY,L=Math.max(1,Math.hypot(dx,dy));
 ctx.lineWidth=13;ctx.strokeStyle=dark;ctx.beginPath();ctx.moveTo(pivotX-dx*.36,pivotY-dy*.36);ctx.lineTo(tipX,tipY);ctx.stroke();
 ctx.lineWidth=8;ctx.strokeStyle=trim;ctx.beginPath();ctx.moveTo(pivotX-dx*.36,pivotY-dy*.36);ctx.lineTo(tipX,tipY);ctx.stroke();
 ctx.fillStyle='#514334';ctx.fillRect(pivotX-dx*.36-15,pivotY-dy*.36-12,30,25); // counterweight
 ctx.fillStyle='#b59a72';ctx.fillRect(pivotX-9,pivotY-9,18,18);ctx.fillStyle=dark;ctx.fillRect(pivotX-4,pivotY-4,8,8);
 // Bucket at tip rather than a Y-shaped rubber-band slingshot.
 ctx.strokeStyle='#40342a';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(tipX-22,tipY-2);ctx.lineTo(tipX-19,tipY+14);ctx.lineTo(tipX+19,tipY+14);ctx.lineTo(tipX+22,tipY-2);ctx.stroke();
 ctx.restore();
 if(state.shots>0&&!state.ended){
  if(state.armKick<=0||state.drag){
   let bx=state.drag?state.dragX:loadedX,by=state.drag?state.dragY:loadedY;
   drawBall(bx,by,BALLS[state.selected],BALLS[state.selected].r);
  }
  if(state.drag){
   const vx=(loadedX-state.dragX)*6.9,vy=(loadedY-state.dragY)*6.9;
   ctx.fillStyle='#fcfcf0b8';
   for(let t=.14;t<1.75;t+=.15){let xx=loadedX+vx*t,yy=loadedY+vy*t+GRAV*t*t/2;if(xx>CW||yy>CH)break;ctx.fillRect(xx,yy,5,5);}
  }
 }
}
function drawStatus(){ctx.textBaseline='top';ctx.textAlign='left';ctx.fillStyle='#f8fbfcce';ctx.fillRect(18,16,196,32);ctx.fillStyle='#354d56';ctx.font='bold 15px system-ui';ctx.fillText(`第 ${state.level+1} 关   ·   ${state.shots} 发剩余`,30,23);ctx.fillStyle='#273e4ba3';ctx.fillRect(950,16,313,32);ctx.fillStyle='#f4fffc';ctx.font='14px system-ui';ctx.fillText('目标：摧毁全部像素守卫',966,24);if(state.paused){ctx.fillStyle='#0e203caa';ctx.fillRect(0,0,CW,CH);ctx.fillStyle='white';ctx.font='bold 56px system-ui';ctx.textAlign='center';ctx.fillText('已暂停',CW/2,CH/2);}}
function render(){ctx.save();ctx.translate((Math.random()-.5)*state.shake,(Math.random()-.5)*state.shake);drawBackdrop();ctx.imageSmoothingEnabled=false;ctx.drawImage(terrainCanvas,0,0,CW,CH);drawObjects();drawLauncher();ctx.restore();drawStatus();}
let previous=performance.now(),acc=0;
function loop(now){let dt=Math.min(.04,(now-previous)/1000);previous=now;acc+=dt;let c=0;while(acc>=FIXED&&c++<6){update(FIXED);acc-=FIXED;}render();requestAnimationFrame(loop);}
function startDrag(ev){if(state.ended||state.paused||!state.shots)return;let r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)*CW/r.width,y=(ev.clientY-r.top)*CH/r.height; // Allow dragging either on the projectile or from the launcher zone.
if(Math.hypot(x-CANNON_X,y-(CANNON_Y-13))>100)return;state.drag=true;state.dragX=CANNON_X;state.dragY=CANNON_Y-13;state.dragStartX=x;state.dragStartY=y;moveDrag(ev);canvas.setPointerCapture?.(ev.pointerId);}
function moveDrag(ev){if(!state.drag)return;let rect=canvas.getBoundingClientRect(),x=(ev.clientX-rect.left)*CW/rect.width,y=(ev.clientY-rect.top)*CH/rect.height;let dx=x-state.dragStartX,dy=y-state.dragStartY;let mag=Math.hypot(dx,dy),cap=Math.min(110,mag);if(mag>1){state.dragX=CANNON_X+dx/mag*cap;state.dragY=CANNON_Y-13+dy/mag*cap;}else{state.dragX=CANNON_X;state.dragY=CANNON_Y-13;}}
function endDrag(){if(!state.drag)return;state.drag=false;let dx=CANNON_X-state.dragX,dy=CANNON_Y-13-state.dragY;if(Math.hypot(dx,dy)<10)return;let vx=dx*6.9,vy=dy*6.9;if(vx<70){UI.hint.textContent='把方块向左后方拉，再松手，才能向右发射';return;}const ball=BALLS[state.selected];state.projectiles.push({x:CANNON_X,y:CANNON_Y-13,vx,vy,kind:ball,r:ball.r,rot:0,spin:vx/460,age:0,dead:false,resting:false,lastImpact:-100,uses:0,drillEnergy:360});state.armKick=.38;state.shots--;state.lastShot=state.t;UI.hint.textContent=`已发射 ${ball.label} · 尝试切换不同弹药`;audio('wood_like',.35);updateHUD();}
canvas.addEventListener('pointerdown',startDrag);canvas.addEventListener('pointermove',moveDrag);canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',()=>state.drag=false);canvas.addEventListener('contextmenu',ev=>ev.preventDefault());
BALLS.forEach((ball,i)=>{let b=document.createElement('button');b.className='ball';b.innerHTML=`<span class="ball-icon sprite-icon ${ball.id==='blackhole'?'blackhole-icon':''}" style="${ball.sprite?`background-image:url(assets/textures/${ball.sprite}.png)`:''}">${ball.sprite?'':ball.short}</span><span><b>${i+1}. ${ball.label}</b><small>${ball.detail}</small></span>`;b.title=ball.detail;b.addEventListener('click',()=>{state.selected=i;updateHUD();});UI.bar.appendChild(b);});
function next(){initLevel((state.level+1)%LEVELS.length);}function restart(){initLevel(state.level);}
$('#restart').addEventListener('click',restart);$('#retryBtn').addEventListener('click',restart);$('#skip').addEventListener('click',next);$('#nextBtn').addEventListener('click',next);$('#pause').addEventListener('click',()=>{state.paused=!state.paused;updateHUD();});$('#soundToggle').addEventListener('click',()=>{soundOn=!soundOn;UI.sound.textContent=soundOn?'♫ 音效开':'♪ 音效关';});
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.key>='1'&&e.key<='4'){state.selected=Number(e.key)-1;updateHUD();}if(e.key.toLowerCase()==='r')restart();if(e.key.toLowerCase()==='n')next();if(e.code==='Space'){e.preventDefault();state.paused=!state.paused;updateHUD();}});
// Expose non-destructive diagnostics for automated playtesting and future video capture.
window.MCBlockLaunch={getStatus:()=>({level:state.level+1,shots:state.shots,enemiesAlive:state.enemies.filter(e=>e.alive).length,removed:state.removed,bodies:state.dynamic.length,projectiles:state.projectiles.length,restingBlocks:state.projectiles.filter(p=>p.resting).length,blackholes:state.vortices.length,physics:Matter2D?"Matter.js":"fallback",particles:state.particles.length,paused:state.paused,ended:state.ended}),restart,next,select:i=>{if(i>=0&&i<BALLS.length){state.selected=i;updateHUD();}},testShot:(kind,vx=690,vy=-190)=>{let b=BALLS.find(x=>x.id===kind)||BALLS[0];state.projectiles.push({x:CANNON_X,y:CANNON_Y-13,vx,vy,kind:b,r:b.r,rot:0,spin:vx/460,age:0,dead:false,resting:false,lastImpact:-100,uses:0,drillEnergy:360});state.lastShot=state.t;},testBlast:(x,y)=>explosion(x,y,85,140),setLevel:n=>initLevel(Math.max(0,Math.min(LEVELS.length-1,n)))};
initLevel(0);loadSprites();requestAnimationFrame(loop);
})();