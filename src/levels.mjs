import { PixelGrid } from './pixels.mjs';
import { TILE } from './config.mjs';
import {RearLayer} from './rear.mjs';
import {LOADOUTS} from './campaign.mjs';
export const LEVELS=[
  {title:'01 / 村庄小木屋',desc:'击碎窗户，让弹药进入房间'},
  {title:'02 / 石质哨塔',desc:'穿过窗户，瞄准不同高度的守卫'},
  {title:'03 / 双层村庄建筑',desc:'注意入口下方的地窖与守卫'},
  {title:'04 / 掠夺者前哨站',desc:'穿过木墙，攻击高架平台上的守卫'},
  {title:'05 / 小型堡垒',desc:'爆破打开射界，利用爆炸推动其他弹药'},
  {title:'06 / 山坡伐木场',desc:'越过土坡，在屋顶与木屋之间分配烈焰和爆破'},
  {title:'07 / 峡谷吊桥',desc:'高低两路守军，桥板仍会固定在原位'},
  {title:'08 / 采石场工坊',desc:'穿过石窗，清理台地、工坊和地下矿道'},
  {title:'09 / 幽深洞窟',desc:'监守者需要反复重击；先打开洞口再集中火力'},
  {title:'10 / 古城最后防线',desc:'分层堡垒与双监守者，有限弹药考验整场规划'}
];

export function buildLevel(number){
  const level=Math.max(0,Math.min(LEVELS.length-1,Math.trunc(Number(number))||0)),grid=new PixelGrid(512,288),rear=new RearLayer(512,288),enemies=[];
  const visual={rooms:[],roofTiles:new Set(),gables:new Set(),attics:[]};
  const room=(x,y,w,h,m)=>{rear.room(x,y,w,h,m);visual.rooms.push({x:x*16,y:y*16,w:w*16,h:h*16});};
  const row=(x0,x1,y,m)=>{for(let x=x0;x<=x1;x++)grid.tile(x,y,m);};
  const column=(x,y0,y1,m)=>{for(let y=y0;y<=y1;y++)grid.tile(x,y,m);};
  const tile=(x,y,m)=>grid.tile(x,y,m);
  const enemy=(x,y,skin='pillager')=>enemies.push({x:x*TILE,feet:y*TILE,skin,height:skin==='warden'?132:92});
  const roof=(x0,x1,y,m=10)=>{
    const sections=[];
    visual.attics.push({center:(x0+x1+1)*8,base:(y+1)*16,left:x0*16,right:(x1+1)*16});
    const roofRow=(a,b,ty)=>{row(a,b,ty,m);for(let tx=a;tx<=b;tx++)visual.roofTiles.add(ty*32+tx);};
    for(let step=0;x0+step<=x1-step;step++){
      const left=x0+step,right=x1-step;
      if(right-left<=2){roofRow(left,right,y-step);break;}
      roofRow(left,left+1,y-step);roofRow(right-1,right,y-step);
      sections.push({x:left+2,y:y-step,w:right-left-3});
    }
    // The gable rear wall stays fixed just like the remaining foreground.
    for(const part of sections)if(part.w>0){rear.room(part.x,part.y,part.w,1,m);for(let tx=part.x;tx<part.x+part.w;tx++)visual.gables.add(part.y*32+tx);}
  };
  for(let x=0;x<32;x++){tile(x,14,1);tile(x,15,2);tile(x,16,3);tile(x,17,7);rear.grid.tile(x,14,2);rear.grid.tile(x,15,2);rear.grid.tile(x,16,3);rear.grid.tile(x,17,7);}
  // Entire 16x16 blocks form the playable terrain, including every step.
  const surface=(x,top)=>{
    for(let y=Math.min(top,14);y<17;y++){tile(x,y,y<top?0:y===top?1:y<top+2?2:3);rear.grid.tile(x,y,y<top?0:y<top+2?2:3);}
  };
  if(level===1)for(const [x,y] of [[11,13],[12,13],[13,12],[14,12],[15,13],[16,13]])surface(x,y);
  if(level===2){
    // Descending entrance, with a two-block-high cellar below the house.
    surface(12,15);surface(13,16);
    for(let x=14;x<=28;x++)for(let y=14;y<=15;y++)tile(x,y,0);
    room(19,14,10,2,5);rear.grid.tile(21,15,20);rear.grid.tile(27,15,21);
  }
  if(level===3)for(const [x,y] of [[12,15],[13,15],[14,16],[15,16],[16,15],[17,15]])surface(x,y);
  if(level===4)for(const [x,y] of [[10,13],[11,12],[12,12],[13,12],[14,13]])surface(x,y);
  if(level===5)for(const [x,y] of [[11,13],[12,12],[13,11],[14,11],[15,12],[16,13],[23,13],[24,12],[25,12],[26,12],[27,13]])surface(x,y);
  if(level===6){
    for(let x=15;x<=28;x++)surface(x,x<18||x>26?15:17);
    room(16,14,12,3,3);
  }
  if(level===7){
    for(let x=13;x<=16;x++)surface(x,13);
    for(let x=18;x<=29;x++)for(let y=14;y<=15;y++)tile(x,y,0);
    room(18,14,12,2,3);
  }
  if(level===8){
    for(let x=17;x<=30;x++){
      for(let y=10;y<=16;y++)tile(x,y,y===16?11:y<=11?3:0);
      rear.room(x,12,1,4,11);
    }
    // The open three-block entrance fits the taller guardian.
    column(17,12,15,11);tile(17,13,6);tile(17,14,6);tile(17,15,6);
    column(30,12,15,11);row(18,29,9,1);
  }
  if(level===9){
    for(const [x,y] of [[11,13],[12,12],[13,12],[14,13]])surface(x,y);
    for(let x=18;x<=30;x++)for(let y=14;y<=15;y++)tile(x,y,0);
    room(18,13,13,3,11);row(18,30,16,11);
  }
  if(level===0){
    row(20,28,13,16);column(20,10,12,4);column(28,10,12,4);
    tile(20,11,6);tile(28,11,6);roof(19,29,9);
    tile(28,11,17);tile(28,12,18);
    enemy(23,13,'zombie');
    room(21,10,7,3,10,13,[20,9,29,14]);
  }else if(level===1){
    row(23,28,13,16);column(23,5,12,5);column(28,5,12,5);
    row(24,27,9,10);row(22,29,4,5);for(const x of [22,24,27,29])tile(x,3,5);
    tile(23,7,6);tile(23,11,6);tile(28,6,6);
    enemy(25.5,4);enemy(26,9,'zombie');enemy(25.5,13);
    room(24,5,4,4,5,9,[23,4,29,10]);room(24,10,4,3,5,13,[23,9,29,14]);
  }else if(level===2){
    row(19,29,13,16);column(19,7,12,4);column(29,7,12,4);
    row(20,28,10,10);roof(18,30,6,15);
    tile(19,8,6);tile(29,8,6);tile(19,11,6);tile(29,11,6);
    tile(29,11,17);tile(29,12,18);
    enemy(22,10);enemy(27,10);enemy(23,16,'zombie');enemy(27,13,'zombie');
    room(20,7,9,3,10,10,[19,6,30,11]);room(20,11,9,2,10,13,[19,10,30,14]);
  }else if(level===3){
    column(22,6,13,12);column(27,6,13,12);row(20,29,10,13);
    row(20,29,5,13);row(21,28,4,13);row(23,26,3,13);tile(21,9,12);tile(28,9,12);
    for(const x of [22,27]){tile(x,8,6);tile(x,9,6);}
    enemy(24,10);enemy(26,10);enemy(29.4,10);enemy(24.5,14,'zombie');
    room(23,6,4,4,13,10,[22,5,28,11]);
  }else if(level===4){
    row(19,30,13,5);for(const x of [19,21,28,30])column(x,7,12,5);
    row(19,21,6,5);row(28,30,6,5);for(const x of [19,21,28,30])tile(x,5,5);
    row(22,27,10,5);column(22,11,12,16);column(27,11,12,16);
    tile(19,10,6);tile(30,10,6);
    for(const x of [19,21]){tile(x,11,6);tile(x,12,6);}tile(22,11,17);tile(22,12,18);
    enemy(20.5,6);enemy(29.5,6);enemy(25,10);enemy(24,13,'zombie');enemy(26,13,'zombie');
    room(20,7,1,6,5,13,[19,6,22,14]);room(29,7,1,6,5,13,[28,6,31,14]);room(23,11,4,2,5,13,[22,10,28,14]);
  }else if(level===5){
    // Split hillside targets prevent one blast from clearing the entire camp.
    row(18,23,13,10);column(17,9,12,4);column(18,9,12,4);column(23,9,12,4);tile(18,11,6);roof(17,24,8,15);
    // The open loading bay gives ordinary arcs a generous route to the low guard.
    row(25,27,9,15);tile(30,9,15);column(26,10,11,14);column(30,10,13,14);
    room(19,9,4,4,15);room(26,10,4,2,10);
    enemy(20,13,'zombie');enemy(22.5,13);enemy(26,9);enemy(29,14,'zombie');enemy(27.5,9);
  }else if(level===6){
    // A fixed timber bridge crosses the deep ravine; breaking it creates a hole.
    row(18,29,9,15);column(18,10,16,14);column(29,10,14,14);
    column(22,6,8,4);column(27,6,8,4);row(22,27,5,15);tile(22,7,6);tile(27,7,6);
    row(19,25,16,16);row(28,30,13,16);column(19,12,15,16);
    room(23,6,4,3,15);room(19,12,7,4,3);
    enemy(23.5,9);enemy(26,9);enemy(20.5,16,'zombie');enemy(24.5,16,'zombie');enemy(28.5,13);
  }else if(level===7){
    // Open quarry ledges, a wooden machine room, and a low mine gallery.
    row(18,21,10,5);column(21,11,13,5);row(25,30,7,16);column(30,8,13,5);
    row(22,28,13,15);column(22,10,12,14);column(28,10,12,14);row(22,28,9,15);tile(22,11,6);
    row(18,29,16,3);column(18,14,15,5);tile(18,14,6);tile(18,15,6);
    room(23,10,5,3,15);
    enemy(19.5,10);enemy(26,7);enemy(29,7);enemy(25,13);enemy(21,16,'zombie');enemy(27,16,'zombie');
  }else if(level===8){
    // A roof sentry and cave guards protect the first three-hit guardian.
    row(20,24,7,16);column(24,8,8,5);
    enemy(21.5,7);enemy(27,9);enemy(20,16,'zombie');enemy(24.5,16,'warden');enemy(28.5,16);
  }else{
    // Stone towers cover a timber hall above a spacious three-block crypt.
    row(18,30,12,5);for(const x of [21,22,23,26,27,28])tile(x,12,0);column(18,7,11,5);column(30,7,11,5);
    tile(19,6,5);tile(29,6,5);tile(18,9,6);tile(18,10,6);tile(30,9,6);
    // The central bridge has its own canopy; the two wider side intakes stay
    // open all the way to the sky so a normal lob drops into either boss area.
    row(24,25,7,13);
    // A generous open crypt entrance and low dividers keep both guardians in
    // separate blast areas instead of making success depend on a patrol phase.
    column(30,13,15,11);for(const x of [20,24,25,29])column(x,14,15,11);
    room(19,7,3,5,5);room(23,8,4,4,13);room(28,7,2,5,5);
    enemy(19.5,6);enemy(29.5,6);enemy(24.5,12);enemy(25.5,12,'zombie');enemy(21.5,16,'zombie');enemy(22.5,16,'warden');enemy(27.5,16,'warden');enemy(28.5,16);
  }
  // Furniture lives in the destructible rear layer, outside the firing plane.
  const furniture=[[[21,12,19],[22,12,20],[26,12,21]],[[24,12,20],[27,8,21]],[[20,12,19],[21,12,20],[28,12,21],[20,9,21],[27,9,19]],[[23,9,21],[26,9,19]],[[20,12,20],[29,12,21],[23,12,19],[26,12,20]],[[19,12,19],[22,12,20],[28,11,21]],[[23,8,21],[20,15,20]],[[23,12,19],[26,12,20],[28,15,9]],[[19,15,9],[29,15,9]],[[20,11,21],[25,11,19],[28,15,20]]][level];
  for(const [x,y,m] of furniture)rear.grid.tile(x,y,m);
  for(const a of visual.attics){
    const ladderX=Math.floor(a.right/16)-3,from=Math.floor(a.left/16)+2;
    const room=visual.rooms.find(r=>r.y===a.base&&ladderX*16>=r.x&&ladderX*16<r.x+r.w);
    if(!room)continue;
    for(let tx=from;tx<ladderX;tx++)rear.grid.fill(tx*16,a.base-8,16,8,22);
    for(let ty=Math.floor(a.base/16)-1;ty<(room.y+room.h)/16;ty++)rear.grid.tile(ladderX,ty,23);
  }
  // Background objects never enter the destructible/support grid.
  const trees=[{x:31,base:14,height:5,kind:'cherry'}];
  return {...LEVELS[level],shots:LOADOUTS[level].reduce((a,b)=>a+b,0),number:level,grid,rear,enemies,trees,visual};
}
