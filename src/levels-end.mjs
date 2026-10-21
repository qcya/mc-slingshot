import {createLevelBuilder,assignEndermanSpots} from './level-builder.mjs';

export const END_LEVELS=[
 {title:'01 / 末地登陆遗迹',desc:'开放的末地石门廊，留意末影人的换位'},
 {title:'02 / 紫珀驿站',desc:'高低两个房间，潜影贝守住门廊'},
 {title:'03 / 双子紫珀塔',desc:'分开瞄准两座塔楼和底层连廊'},
 {title:'04 / 浮岛连廊',desc:'三座岛台由紫珀桥连接，空隙留下抛射通道'},
 {title:'05 / 黑曜石柱庭',desc:'绕过坚硬立柱，寻找侧面的开放射界'},
 {title:'06 / 潜影货仓',desc:'货台与上层哨位交错，先找安全落点'},
 {title:'07 / 折叠阶城',desc:'逐层升高的露台，考验不同力度的投射'},
 {title:'08 / 失落船坞',desc:'船形紫珀大厅和低处码头分层设防'},
 {title:'09 / 星门卫城',desc:'中央开口连通地下厅，侧塔控制高处'},
 {title:'10 / 末影龙归巢',desc:'先击碎两座黑曜石柱上的治疗水晶，再抓住中央喷泉上方的归巢窗口'}
];

export function buildEnd(level){
 const b=createLevelBuilder('end'),{scene,row,column,tile,room,surface,clear,enemy,roof,slab,prop}=b;
 const sh=(x,y)=>enemy(x,y,'shulker',{stationary:true});
 const en=(x,y)=>enemy(x,y,'enderman');
 if(level===0){
  row(19,29,13,37);column(19,9,12,37);column(29,9,12,37);row(19,29,9,38);clear(19,10,1,3);
  room(20,10,9,3,37);slab(18,30,8,38);sh(21,13);en(24,13);sh(28,13);prop(26,12,21);
 }else if(level===1){
  row(18,23,13,37);column(18,9,12,39);column(23,9,12,39);roof(17,24,8,38,38);clear(18,10,1,3);
  row(26,30,10,38);column(26,11,13,39);column(30,11,13,39);clear(26,11,1,3);room(19,9,4,4,38);room(27,11,3,3,37);
  sh(20,13);en(22,13);sh(28,10);en(28,14);prop(19,12,21);
 }else if(level===2){
  row(19,22,12,37);row(26,30,12,37);column(19,6,11,39);column(22,6,11,39);column(26,6,11,39);column(30,6,11,39);
  row(18,23,5,38);row(25,31,5,38);row(20,21,9,38);row(27,29,9,38);row(23,25,13,37);
  clear(19,7,1,2);clear(19,10,1,2);clear(26,7,1,2);clear(26,10,1,2);room(20,6,2,6,38);room(27,6,3,6,38);
  sh(20.5,5);sh(28.5,5);en(20.5,9);en(28,9);sh(24,13);prop(29,11,21);
 }else if(level===3){
  for(let x=18;x<=30;x++)surface(x,17);room(18,15,13,2,36);
  row(18,21,13,36);row(23,26,10,36);row(28,31,8,36);row(21,23,12,38);row(26,28,9,38);
  column(19,14,16,36);column(24,11,16,36);column(29,9,16,36);slab(23,26,6,38);
  sh(19.5,13);en(24.5,10);sh(29.5,8);en(20.5,13);sh(25.5,10);
 }else if(level===4){
  row(18,30,13,37);column(22,6,12,40);column(29,4,12,40);slab(21,23,5,38);slab(28,30,3,38);
  row(24,27,9,38);column(27,10,12,39);
  // The far obsidian pillar forms an arch with a clear two-block lower firing lane.
  clear(29,11,1,2);row(29,31,10,40);column(31,11,13,40);room(23,10,4,3,37);
  sh(20,13);en(24,13);sh(26,9);en(28.5,13);sh(30.5,13);prop(25,12,21);
 }else if(level===5){
  row(18,30,13,37);column(18,9,12,39);column(30,9,12,39);row(18,22,8,38);row(26,30,8,38);
  row(22,26,10,38);column(22,11,12,39);clear(18,10,1,3);room(19,9,3,4,38);room(23,11,7,2,37);
  sh(20,8);sh(28,8);sh(24,10);en(20,13);en(28,13);sh(25,13);prop(23,12,19);
 }else if(level===6){
  row(18,21,13,37);row(22,25,10,38);row(26,30,7,38);column(18,14,16,37);column(22,11,13,39);column(26,8,13,39);column(30,8,13,39);
  room(23,11,3,3,37);room(27,8,3,6,38);clear(22,12,1,2);clear(26,11,1,3);slab(26,30,3,38);
  sh(19.5,13);en(23.5,10);sh(28,7);en(28,14);sh(24,14);prop(27,13,21);
 }else if(level===7){
  row(18,30,11,38);row(20,28,12,38);row(22,26,13,37);column(20,7,10,39);column(28,7,10,39);
  row(20,28,6,38);row(24,25,4,39);clear(20,8,1,3);room(21,7,7,4,38);
  row(18,21,15,37);clear(18,14,4,1);room(18,14,4,1,36);
  sh(19,11);en(23,11);sh(27,11);sh(24.5,4);en(29.5,11);sh(20,15);prop(21,10,21);prop(26,10,19);
 }else if(level===8){
  clear(18,14,13,2);row(18,30,16,37);room(18,13,13,3,37);
  row(18,21,8,38);row(28,30,8,38);column(18,9,15,39);column(30,9,15,39);row(19,21,12,37);row(28,29,12,37);
  row(24,25,6,40);column(23,7,10,40);column(26,7,10,40);clear(18,13,1,3);
  sh(19.5,8);sh(29,8);en(20.5,12);en(28.5,12);sh(22,16);en(26,16);prop(19,15,21);
 }else{
  // Open sky over an irregular Endstone island and the vanilla exit fountain.
  clear(17,4,15,13);
  for(let x=17;x<32;x++)surface(x,x<19?16:x<22?15:x<29?14:x<31?15:16,36);
  // Seven-wide basin, one-block outer rim and a single three-high centre post.
  // The open bowl avoids the two tall side walls of a castle silhouette.
  row(22,28,15,7);clear(23,14,5,1);tile(22,14,7);tile(28,14,7);
  column(25,12,14,7);
  // Straight two-block-wide pylons: ten and twelve full blocks, without caps.
  for(const x of [18,19])column(x,6,15,40);
  for(const x of [30,31])column(x,4,15,40);
  sh(19.35,6);sh(30.5,4);
  enemy(25.5,12,'ender_dragon',{height:110,flightBounds:{left:1100,right:1320,top:220,bottom:521},healingCrystals:[{x:18.375*48,feet:6*48},{x:31.5*48,feet:4*48}]});

 }
 assignEndermanSpots(scene);
 return {...scene,...END_LEVELS[level]};
}
