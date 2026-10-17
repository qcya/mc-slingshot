import { PixelGrid } from './pixels.mjs';
import { TILE } from './config.mjs';
import {RearLayer} from './rear.mjs';
export const LEVELS=[
  {title:'01 / 村庄小木屋',desc:'击碎窗户，或拆掉屋角让屋顶落下',shots:8},
  {title:'02 / 石质哨塔',desc:'不同高度的守卫，承重柱和石质塔楼',shots:8},
  {title:'03 / 双层村庄建筑',desc:'打穿楼板，让上层残骸击中下层',shots:9},
  {title:'04 / 掠夺者前哨站',desc:'高架木楼与外挑平台，试试破坏支柱',shots:9},
  {title:'05 / 小型堡垒',desc:'双塔、门楼和厚墙，合理切换四种弹药',shots:10}
];

export function buildLevel(number){
  const level=Math.max(0,Math.min(4,number)),grid=new PixelGrid(512,288),rear=new RearLayer(512,288),enemies=[];
  const room=(x,y,w,h,m,floor,b)=>rear.room(x,y,w,h,m,floor*16,{x0:b[0]*16,y0:b[1]*16,x1:b[2]*16,y1:b[3]*16});
  const row=(x0,x1,y,m)=>{for(let x=x0;x<=x1;x++)grid.tile(x,y,m);};
  const column=(x,y0,y1,m)=>{for(let y=y0;y<=y1;y++)grid.tile(x,y,m);};
  const tile=(x,y,m)=>grid.tile(x,y,m);
  const enemy=(x,y,skin='pillager')=>enemies.push({x:x*TILE,feet:y*TILE,skin});
  const roof=(x0,x1,y,m=10)=>{
    const sections=[];
    for(let step=0;x0+step<=x1-step;step++){
      const left=x0+step,right=x1-step;
      if(right-left<=2){row(left,right,y-step,m);break;}
      row(left,left+1,y-step,m);row(right-1,right,y-step,m);
      sections.push({x:left+2,y:y-step,w:right-left-3});
    }
    // The gable is a non-colliding rear wall, carried by its own roof beams.
    for(const part of sections)if(part.w>0)rear.room(part.x,part.y,part.w,1,m,x=>{
      let yy=part.y*16-1;while(yy>0&&!grid.get(x,yy))yy--;return yy;
    },{x0:x0*16,y0:Math.max(0,y-Math.ceil((x1-x0)/2))*16,x1:(x1+1)*16,y1:(y+1)*16});
  };
  for(let x=0;x<32;x++){tile(x,14,1);tile(x,15,2);tile(x,16,3);tile(x,17,7);rear.grid.tile(x,14,2);rear.grid.tile(x,15,2);rear.grid.tile(x,16,3);rear.grid.tile(x,17,7);}
  if(level===0){
    row(20,28,13,16);column(20,10,12,4);column(28,10,12,4);
    tile(20,11,6);tile(28,11,6);roof(19,29,9);
    tile(28,11,17);tile(28,12,18);
    enemy(23,13,'zombie');enemy(26.5,13);
    room(21,10,7,3,10,13,[20,9,29,14]);
  }else if(level===1){
    row(23,28,13,16);column(23,5,12,5);column(28,5,12,5);
    row(24,27,9,10);row(22,29,4,5);for(const x of [22,24,27,29])tile(x,3,5);
    tile(23,7,6);tile(28,6,6);
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
    enemy(24,10);enemy(26,10);enemy(28.7,10);enemy(24.5,14,'zombie');
    room(23,6,4,4,13,10,[22,5,28,11]);
  }else{
    row(19,30,13,5);for(const x of [19,21,28,30])column(x,7,12,5);
    row(19,21,6,5);row(28,30,6,5);for(const x of [19,21,28,30])tile(x,5,5);
    row(22,27,10,5);column(22,11,12,16);column(27,11,12,16);
    tile(19,10,6);tile(30,10,6);
    enemy(20.5,6);enemy(29.5,6);enemy(25,10);enemy(24,13,'zombie');enemy(26,13,'zombie');
    room(20,7,1,6,5,13,[19,6,22,14]);room(29,7,1,6,5,13,[28,6,31,14]);room(23,11,4,2,5,13,[22,10,28,14]);
  }
  // Background objects never enter the destructible/support grid.
  const trees=[{x:11,base:14,height:5,kind:level===1?'spruce':'oak'},
    {x:1,base:14,height:6,kind:'spruce'},{x:31,base:14,height:4,kind:'oak'}];
  return {...LEVELS[level],number:level,grid,rear,enemies,trees};
}
