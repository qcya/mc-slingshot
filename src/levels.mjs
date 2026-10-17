import { PixelGrid } from './pixels.mjs';
import { TILE } from './config.mjs';
export const LEVELS=[
  {title:'01 / 村庄小木屋',desc:'击碎窗户，或拆掉屋角让屋顶落下',shots:8},
  {title:'02 / 石质哨塔',desc:'不同高度的守卫，承重柱和石质塔楼',shots:8},
  {title:'03 / 双层村庄建筑',desc:'打穿楼板，让上层残骸击中下层',shots:9},
  {title:'04 / 掠夺者前哨站',desc:'高架木楼与外挑平台，试试破坏支柱',shots:9},
  {title:'05 / 小型堡垒',desc:'双塔、门楼和厚墙，合理切换四种弹药',shots:10}
];

export function buildLevel(number){
  const level=Math.max(0,Math.min(4,number)),grid=new PixelGrid(512,288),enemies=[];
  const row=(x0,x1,y,m)=>{for(let x=x0;x<=x1;x++)grid.tile(x,y,m);};
  const column=(x,y0,y1,m)=>{for(let y=y0;y<=y1;y++)grid.tile(x,y,m);};
  const tile=(x,y,m)=>grid.tile(x,y,m);
  const enemy=(x,y,skin='pillager')=>enemies.push({x:x*TILE,feet:y*TILE,skin});
  const roof=(x0,x1,y,m=10)=>{
    for(let step=0;x0+step<=x1-step;step++){
      const left=x0+step,right=x1-step;
      if(right-left<=2){row(left,right,y-step,m);break;}
      row(left,left+1,y-step,m);row(right-1,right,y-step,m);
    }
  };
  for(let x=0;x<32;x++){tile(x,14,1);tile(x,15,2);tile(x,16,3);tile(x,17,7);}
  if(level===0){
    row(20,28,13,16);column(20,10,12,4);column(28,10,12,4);
    tile(20,11,6);tile(28,11,6);roof(19,29,9);
    tile(28,11,17);tile(28,12,18);
    enemy(23,13,'zombie');enemy(26.5,13);
  }else if(level===1){
    row(23,28,13,16);column(23,5,12,5);column(28,5,12,5);
    row(24,27,9,10);row(22,29,4,5);for(const x of [22,24,27,29])tile(x,3,5);
    tile(23,7,6);tile(28,6,6);
    enemy(25.5,4);enemy(26,9,'zombie');enemy(25.5,13);
  }else if(level===2){
    row(19,29,13,16);column(19,7,12,4);column(29,7,12,4);
    row(20,28,10,10);roof(18,30,6,15);
    tile(19,8,6);tile(29,8,6);tile(19,11,6);tile(29,11,6);
    tile(29,11,17);tile(29,12,18);
    enemy(22,10);enemy(27,10);enemy(23,13,'zombie');enemy(27,13,'zombie');
  }else if(level===3){
    column(22,6,13,12);column(27,6,13,12);row(20,29,10,13);
    row(20,29,5,13);row(21,28,4,13);row(23,26,3,13);tile(21,9,12);tile(28,9,12);
    enemy(24,10);enemy(26,10);enemy(28.7,10);enemy(24.5,14,'zombie');
  }else{
    row(19,30,13,5);for(const x of [19,21,28,30])column(x,7,12,5);
    row(19,21,6,5);row(28,30,6,5);for(const x of [19,21,28,30])tile(x,5,5);
    row(22,27,10,5);column(22,11,12,16);column(27,11,12,16);
    tile(19,10,6);tile(30,10,6);
    enemy(20.5,6);enemy(29.5,6);enemy(25,10);enemy(24,13,'zombie');enemy(26,13,'zombie');
  }
  // Background objects never enter the destructible/support grid.
  const trees=[{x:11,base:14,height:5,kind:level===1?'spruce':'oak'},
    {x:1,base:14,height:6,kind:'spruce'},{x:31,base:14,height:4,kind:'oak'}];
  return {...LEVELS[level],number:level,grid,enemies,trees};
}
