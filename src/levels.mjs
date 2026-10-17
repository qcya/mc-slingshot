import { PixelGrid } from './pixels.mjs';
import { TILE } from './config.mjs';
import {RearLayer} from './rear.mjs';
import {LOADOUTS} from './campaign.mjs';
export const LEVELS=[
  {title:'01 / 村庄小木屋',desc:'击碎窗户，让弹药进入房间'},
  {title:'02 / 石质哨塔',desc:'穿过窗户，瞄准不同高度的守卫'},
  {title:'03 / 双层村庄建筑',desc:'楼板可破坏，剩余房屋保持固定'},
  {title:'04 / 掠夺者前哨站',desc:'穿过木墙，攻击高架平台上的守卫'},
  {title:'05 / 小型堡垒',desc:'爆破打开射界，利用爆炸推动其他弹药'}
];

export function buildLevel(number){
  const level=Math.max(0,Math.min(4,number)),grid=new PixelGrid(512,288),rear=new RearLayer(512,288),enemies=[];
  const visual={rooms:[],roofTiles:new Set(),gables:new Set(),attics:[]};
  const room=(x,y,w,h,m)=>{rear.room(x,y,w,h,m);visual.rooms.push({x:x*16,y:y*16,w:w*16,h:h*16});};
  const row=(x0,x1,y,m)=>{for(let x=x0;x<=x1;x++)grid.tile(x,y,m);};
  const column=(x,y0,y1,m)=>{for(let y=y0;y<=y1;y++)grid.tile(x,y,m);};
  const tile=(x,y,m)=>grid.tile(x,y,m);
  const enemy=(x,y,skin='pillager')=>enemies.push({x:x*TILE,feet:y*TILE,skin});
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
    enemy(22,10);enemy(27,10);enemy(23,13,'zombie');enemy(27,13,'zombie');
    room(20,7,9,3,10,10,[19,6,30,11]);room(20,11,9,2,10,13,[19,10,30,14]);
  }else if(level===3){
    column(22,6,13,12);column(27,6,13,12);row(20,29,10,13);
    row(20,29,5,13);row(21,28,4,13);row(23,26,3,13);tile(21,9,12);tile(28,9,12);
    for(const x of [22,27]){tile(x,8,6);tile(x,9,6);}
    enemy(24,10);enemy(26,10);enemy(28.7,10);enemy(24.5,14,'zombie');
    room(23,6,4,4,13,10,[22,5,28,11]);
  }else{
    row(19,30,13,5);for(const x of [19,21,28,30])column(x,7,12,5);
    row(19,21,6,5);row(28,30,6,5);for(const x of [19,21,28,30])tile(x,5,5);
    row(22,27,10,5);column(22,11,12,16);column(27,11,12,16);
    tile(19,10,6);tile(30,10,6);
    for(const x of [19,21]){tile(x,11,6);tile(x,12,6);}tile(22,11,17);tile(22,12,18);
    enemy(20.5,6);enemy(29.5,6);enemy(25,10);enemy(24,13,'zombie');enemy(26,13,'zombie');
    room(20,7,1,6,5,13,[19,6,22,14]);room(29,7,1,6,5,13,[28,6,31,14]);room(23,11,4,2,5,13,[22,10,28,14]);
  }
  // Furniture lives in the destructible rear layer, outside the firing plane.
  const furniture=[[[21,12,19],[22,12,20],[26,12,21]],[[24,12,20],[27,8,21]],[[20,12,19],[21,12,20],[28,12,21],[20,9,21],[27,9,19]],[[23,9,21],[26,9,19]],[[20,12,20],[29,12,21],[23,12,19],[26,12,20]]][level];
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
