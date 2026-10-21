import {createLevelBuilder} from './level-builder.mjs';

// Native MIT community-mod materials and species; encounter roles are adapted.
// Landforms carry the composition. Ruins are fragments, with open sky between.
export const SIFT_LEVELS=[
 {title:'01 / 柳林初径',desc:'同一条林间空地上的三只原生生物；一把三叉戟有三次耐久'},
 {title:'02 / 分岔幽谷',desc:'两岸与谷底形成三条射线，先观察谷地的高低差'},
 {title:'03 / 覆生阶城',desc:'顺着破碎台阶逐层抬高准星，废墟之间留着开阔天光'},
 {title:'04 / 断柳长桥',desc:'木桥上的低矮生物与谷底目标分开瞄准'},
 {title:'05 / 回声落穴',desc:'塌陷的坡面通向深处，吟唱者站在最低的台地'},
 {title:'06 / 失落书林',desc:'树根与残存书台交错，穿过开放的林间射界'},
 {title:'07 / 天光竖井',desc:'两侧断崖与中央悬台围住深井，井口完全敞开'},
 {title:'08 / 裂脊碑林',desc:'断裂石碑跨过低谷，高低目标各有自己的落点'},
 {title:'09 / 沉降剧场',desc:'天然台阶围成下沉的回声场，侧翼与底部依次清理'},
 {title:'10 / 破环圣地',desc:'覆生山丘托起破碎圣环；回声傀儡蓄势后露出重击窗口'}
];

export function buildSift(level){
 const {scene,row,column,tile,surface,enemy}=createLevelBuilder('sift');
 const land=(from,to,top)=>{for(let x=from;x<=to;x++)surface(x,top,42);};
 let ordinary=0;
 const guard=(x,feet)=>{const skin=ordinary++%2?'sift_sifter':'sift_blub';enemy(x,feet,skin,{height:skin==='sift_blub'?48:46});};
 const singer=(x,feet)=>enemy(x,feet,'sift_singer',{height:146,stationary:true});
 // Sparse rear trunks/roots create depth without large rectangular back walls.
 const ghostWillow=(x,top,bottom)=>{
  const rear=scene.rear.grid;
  for(let y=top+1;y<=bottom;y++)rear.tile(x,y,45);
  // Native willow foliage wraps the branches; uneven vines soften its edge.
  rear.tile(x-1,top+1,45);rear.tile(x+1,top+1,45);
  for(const [dy,radius]of [[-1,1],[0,2],[1,2],[2,1]])for(let dx=-radius;dx<=radius;dx++)rear.tile(x+dx,top+dy,48);
  for(const [dx,length]of [[-2,2],[2,3]])for(let dy=0;dy<length&&top+2+dy<bottom;dy++)rear.tile(x+dx,top+2+dy,dy===length-1?50:49);
 };
 const root=(x,y)=>{tile(x,y,47);};
 if(level===0){
  land(18,29,13);land(30,31,14);land(16,17,14);
  ghostWillow(18,7,12);ghostWillow(29,6,12);column(30,9,13,45);row(29,31,8,47);
  root(19,13);root(28,13);guard(21,13);guard(24,13);guard(27,13);
 }else if(level===1){
  land(18,21,12);land(22,26,15);land(27,31,11);
  row(19,20,12,43);row(28,29,11,43);column(27,9,10,44);tile(28,8,44);
  ghostWillow(18,7,11);ghostWillow(31,5,10);root(23,15);
  guard(20,12);guard(23.5,15);guard(25.5,15);guard(29.5,11);
 }else if(level===2){
  land(18,21,14);land(22,25,12);land(26,28,10);land(29,31,8);
  row(22,24,12,43);row(26,28,10,43);row(29,31,8,43);column(31,4,7,44);tile(30,4,44);
  ghostWillow(19,8,13);root(25,12);root(28,10);
  guard(20,14);guard(23.5,12);guard(27,10);guard(30,8);
 }else if(level===3){
  land(18,21,12);land(22,27,16);land(28,31,11);
  row(21,28,10,46);column(23,11,15,45);column(28,11,14,45);row(23,27,16,47);
  ghostWillow(18,6,11);ghostWillow(31,5,10);tile(21,9,45);tile(28,9,45);
  guard(20,12);guard(23.5,10);guard(26,10);guard(25.5,16);singer(30,11);
 }else if(level===4){
  land(18,20,11);land(21,23,13);land(24,28,16);land(29,31,12);
  row(24,28,16,47);row(21,22,13,43);column(31,7,11,44);tile(30,7,43);
  ghostWillow(18,5,10);root(24,16);guard(19.5,11);guard(22,13);guard(25.5,16);guard(30,12);singer(28,16);
 }else if(level===5){
  land(18,22,14);land(23,26,13);land(27,31,14);
  column(18,8,13,45);column(31,9,13,45);row(17,19,7,47);row(30,31,8,47);
  row(21,23,9,46);column(23,10,12,45);row(27,29,10,46);column(29,11,13,45);
  scene.rear.grid.tile(21,10,46);scene.rear.grid.tile(28,11,46);ghostWillow(26,5,12);
  guard(20,14);guard(22,9);guard(28,10);guard(27.5,14);singer(25,13);
 }else if(level===6){
  land(18,20,8);land(21,28,16);land(29,31,7);
  row(22,23,12,43);column(23,13,15,44);row(27,28,10,43);column(27,11,15,44);
  row(18,20,8,47);row(29,31,7,43);tile(20,6,44);tile(30,5,44);
  guard(19,8);guard(30,7);guard(22.5,12);guard(27.5,10);singer(25,16);
 }else if(level===7){
  land(18,21,10);land(22,25,15);land(26,28,12);land(29,31,9);
  column(20,5,9,44);tile(19,5,43);column(30,4,8,44);tile(31,4,43);
  row(22,24,15,47);row(26,28,12,43);ghostWillow(27,6,11);
  guard(19,10);guard(23.5,15);guard(27,12);guard(29.4,9);singer(25,15);
 }else if(level===8){
  land(18,20,9);land(21,23,12);land(24,28,16);land(29,31,10);
  row(18,20,9,43);row(21,23,12,43);row(24,28,16,47);row(29,31,10,43);
  column(18,5,8,44);column(31,6,9,44);ghostWillow(23,6,11);tile(29,8,44);
  guard(19.5,9);guard(22,12);guard(25,16);guard(30,10);singer(28,16);
 }else{
  land(18,20,13);land(21,23,15);land(24,28,14);land(29,31,12);
  // Broken circular arch, rooted in unequal hills, with a broad open middle.
  column(21,8,10,44);column(22,6,7,43);row(23,24,5,44);
  row(27,28,5,44);column(29,6,7,43);column(31,8,11,44);
  row(25,27,14,43);row(25,27,15,44);tile(24,14,47);tile(28,14,47);
  ghostWillow(18,7,12);ghostWillow(30,6,11);
  guard(19.5,13);guard(22.5,15);guard(28,14);guard(30,12);
  enemy(26,14,'sift_echo_golem',{height:114,stationary:true});
 }
 return {...scene,...SIFT_LEVELS[level]};
}
