import {createLevelBuilder} from './level-builder.mjs';

export const NETHER_LEVELS=[
 {title:'01 / 熔岩渡口',desc:'从开放的砖拱射入，避开入口旁的岩浆'},
 {title:'02 / 绯红营地',desc:'两座菌木棚分散守军，注意疣猪兽的宽阔身躯'},
 {title:'03 / 灵魂土岗楼',desc:'低处兽栏和高塔各留一条射击通道'},
 {title:'04 / 玄武岩长桥',desc:'桥面与谷底守军分层站位，桥板不会自行坍塌'},
 {title:'05 / 疣林双工坊',desc:'绕过菌柄立柱，穿入两个开放工坊'},
 {title:'06 / 堡垒城门',desc:'高处箭楼与低处兽栏需要不同抛射角度'},
 {title:'07 / 诡异货仓',desc:'错落屋顶留下投入口，清理货台两侧'},
 {title:'08 / 交错要塞',desc:'三段不同高度的砖廊构成连续防线'},
 {title:'09 / 黑石监牢',desc:'从开放缺口进入下沉牢室'},
 {title:'10 / 凋灵祭坛',desc:'绕开玄武岩角楼；凋灵蓄势后会短暂悬停，抓住重击窗口'}
];

export function buildNether(level){
 const b=createLevelBuilder('nether'),{scene,row,column,tile,room,surface,clear,enemy,roof,slab,prop,lava}=b;
 const pig=(x,y,stationary=false)=>enemy(x,y,'zombified_piglin',stationary?{stationary:true}:{});
 const hog=(x,y)=>enemy(x,y,'hoglin');
 if(level===0){
  row(19,29,13,25);column(19,9,12,25);column(29,9,12,25);row(19,29,9,25);
  clear(19,11,1,2);room(20,10,9,3,25);tile(19,8,26);tile(29,8,26);
  pig(21.5,13);hog(25,13);pig(28,13);lava(16,8,{flowing:true});prop(20,12,20);
 }else if(level===1){
  row(18,23,13,31);column(18,9,12,33);column(23,9,12,33);roof(17,24,8,31,31);clear(18,11,1,2);
  row(26,30,11,32);column(26,8,10,34);column(30,8,10,34);slab(25,31,7,32);clear(26,9,1,2);clear(23,11,1,2);
  room(19,9,4,4,31);room(27,8,3,3,32);pig(20.5,13);hog(22,13);pig(28,11);pig(29,14);lava(16,14);
  // A small open bay underneath the higher hut gives the lower guard a floor.
  prop(19,12,19);prop(27,10,21);
 }else if(level===2){
  for(let x=12;x<=16;x++)surface(x,x===14?12:13,30);
  row(24,29,13,28);column(24,5,12,28);column(29,5,12,28);row(23,30,5,25);row(25,28,9,31);
  clear(24,7,1,2);clear(24,11,1,2);room(25,6,4,3,25);room(25,10,4,3,28);
  row(18,22,10,29);column(18,11,13,29);clear(18,12,1,2);room(19,11,4,3,30);
  pig(26,5,true);pig(27,9);pig(27,13);hog(21,14);lava(17,14);prop(25,12,20);
 }else if(level===3){
  for(let x=18;x<=29;x++)surface(x,17);room(19,13,10,4,29);
  row(18,30,9,25);column(18,10,16,29);column(30,10,16,29);row(19,28,16,28);
  row(21,27,12,29);column(19,13,15,28);clear(19,13,1,3);clear(18,12,1,4);room(22,10,6,2,25);
  pig(20,9);pig(27.5,9);hog(25,16);pig(21,16);lava(16,5,{flowing:true});
  prop(23,15,20);prop(27,15,19);
 }else if(level===4){
  row(18,23,13,31);column(18,9,12,33);column(23,9,12,33);row(17,24,8,31);clear(18,11,1,2);
  row(25,30,13,32);column(25,8,12,34);column(30,8,12,34);roof(24,31,7,32,32);clear(25,10,1,3);clear(23,10,1,3);
  room(19,9,4,4,31);room(26,8,4,5,32);pig(20,13);hog(22,13);pig(27,13);hog(29,13);pig(21,8,true);
  lava(16,14);prop(19,12,19);prop(26,12,20);prop(28,12,21);
 }else if(level===5){
  row(18,30,13,28);for(const x of [18,21,28,30])column(x,7,12,28);
  row(18,21,6,28);row(28,30,6,28);for(const x of [18,21,28,30])tile(x,5,27);
  row(22,27,10,26);column(22,11,12,25);column(27,11,12,25);clear(18,10,1,3);clear(21,11,1,2);clear(22,11,1,2);
  room(19,7,2,6,28);room(29,7,1,6,28);room(23,11,4,2,26);
  pig(19.5,6,true);pig(29.5,6,true);pig(24,10);hog(25,13);pig(20,13);lava(16,14);prop(23,12,20);
 }else if(level===6){
  row(18,23,12,32);column(18,8,11,34);column(23,8,11,34);roof(17,24,7,32,32);clear(18,10,1,2);
  row(25,30,10,31);column(25,11,13,33);column(30,11,13,33);slab(24,31,9,31);clear(25,12,1,2);
  room(19,8,4,4,32);room(26,11,4,3,31);pig(20,12);hog(22,12);pig(27,10);hog(28,14);pig(29,10);
  // The tall warehouse side faces are open to the left and have no glass.
  clear(25,9,5,1);lava(31,4,{flowing:true});prop(19,11,21);prop(26,13,19);
 }else if(level===7){
  row(18,21,11,25);column(18,12,13,25);column(21,12,13,25);
  row(23,27,8,26);column(23,9,13,25);column(27,9,13,25);clear(23,11,1,3);
  row(28,31,5,28);column(31,6,13,29);column(28,6,7,29);row(24,30,13,28);
  room(24,9,3,4,26);room(28,8,3,5,25);
  pig(19.5,11);pig(25,8);pig(29.5,5,true);hog(25.5,13);pig(29,13);lava(16,14);prop(24,12,20);
 }else if(level===8){
  clear(18,14,13,2);row(18,30,16,28);room(18,13,13,3,28);
  row(19,30,12,28);clear(21,12,3,1);clear(27,12,2,1);column(19,9,11,29);column(30,9,15,29);
  row(19,22,8,25);row(27,30,8,25);column(18,14,15,28);clear(18,14,1,2);
  pig(20.5,8,true);pig(28.5,8,true);hog(22,16);pig(26,16);hog(28.5,16);pig(25,12);lava(16,14);
  prop(19,15,20);prop(24,15,21);
 }else{
  // A single open summoning basin replaces the former stacked hoglin rooms.
  clear(17,6,15,10);row(17,31,16,28);room(17,7,15,9,30);
  row(18,20,9,28);column(18,10,15,29);row(29,31,8,28);column(31,9,15,29);
  row(23,27,13,30);row(23,27,14,27);row(23,27,15,28);
  pig(19,9,true);pig(30,8,true);hog(20.5,16);
  enemy(25,13,'wither',{height:88,flightBounds:{left:1080,right:1300,top:270,bottom:540}});
  lava(16,14);lava(31,14);prop(18,15,20);

 }
 return {...scene,...NETHER_LEVELS[level]};
}
