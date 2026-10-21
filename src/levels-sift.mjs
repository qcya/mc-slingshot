import {createLevelBuilder,assignEndermanSpots} from './level-builder.mjs';

// Community-inspired adaptation, not an assertion of unreleased vanilla rules.
// Clear horizontal lanes teach trident penetration; high and low galleries then
// require the player to combine it with the eight previously earned items.
export const SIFT_LEVELS=[
 {title:'01 / 覆生门廊',desc:'沿同一射线站立的守军，试试三叉戟'},
 {title:'02 / 回声石庭',desc:'破碎拱门围出两个高低射界'},
 {title:'03 / 柳木驿站',desc:'覆生柳木与筛板岩构成的双层驿站'},
 {title:'04 / 灵魂台阶',desc:'层叠台地通向古老的回声门'},
 {title:'05 / 峡谷连桥',desc:'两座断崖间的短桥与低处通道'},
 {title:'06 / 幽匿书厅',desc:'高处货台与底层守军共享一条长廊'},
 {title:'07 / 古门前哨',desc:'半埋入台地的门廊留下侧面射界'},
 {title:'08 / 覆生双塔',desc:'两座塔楼、斜坡台地和相通的内院'},
 {title:'09 / 回声深庭',desc:'下沉庭院与外侧守军分层设防'},
 {title:'10 / 筛界遗城',desc:'古门、双层连廊和最后的深庭'}
];

export function buildSift(level){
 const b=createLevelBuilder('sift'),{scene,row,column,room,clear,enemy,roof,slab,prop}=b;
 const guard=(x,feet)=>enemy(x,feet,'pillager');
 const heavy=(x,feet)=>enemy(x,feet,'warden');
 if(level===0){
  row(18,30,13,43);column(19,9,12,44);column(30,9,12,44);row(19,30,8,43);
  clear(19,10,1,3);room(20,9,10,4,41);slab(18,31,8,44);
  guard(22,13);guard(25,13);guard(28,13);prop(20,12,21);
 }else if(level===1){
  row(18,30,13,43);column(20,9,12,44);column(29,9,12,44);row(20,29,7,43);clear(20,10,1,3);
  row(24,29,10,43);room(21,8,8,5,41);guard(22,13);guard(26,13);guard(27,10);guard(29,7);
 }else if(level===2){
  row(18,30,13,43);column(20,8,12,45);column(29,8,12,45);row(20,29,10,46);roof(19,30,7,46,46);
  room(21,8,8,5,46);clear(20,11,1,2);guard(22,13);guard(26,13);guard(23,10);guard(27,10);prop(25,12,21);
 }else if(level===3){
  row(18,21,13,43);row(22,25,11,43);row(26,30,9,43);column(23,12,13,44);column(29,10,13,44);
  column(26,5,8,44);column(30,5,8,44);row(26,30,4,43);clear(26,6,1,3);room(27,5,3,4,41);
  guard(19,13);guard(23,11);guard(27,9);guard(29,9);heavy(17,14);
 }else if(level===4){
  clear(22,14,4,2);row(21,27,12,43);row(18,21,13,43);row(27,31,10,43);column(29,11,13,44);
  room(18,10,4,3,41);column(18,9,12,44);row(18,21,9,43);clear(18,10,1,3);
  guard(20,13);guard(23,12);guard(25,12);guard(28,10);heavy(30,10);
 }else if(level===5){
  row(18,30,13,43);column(19,6,12,45);column(30,6,12,45);roof(18,31,5,46,46);
  row(20,24,9,46);row(27,29,9,46);room(20,6,10,7,46);clear(19,10,1,3);
  guard(21,13);guard(24,13);guard(28,13);guard(22,9);guard(28,9);heavy(26,13);prop(20,12,21);
 }else if(level===6){
  row(18,30,13,43);column(20,5,12,44);column(29,5,12,44);row(20,29,4,43);row(21,28,5,44);
  row(24,28,9,43);room(21,6,8,7,41);clear(20,10,1,3);guard(22,13);guard(25,13);guard(28,13);guard(25,9);guard(28,9);heavy(23,13);
 }else if(level===7){
  row(18,30,13,43);column(19,6,12,44);column(23,6,12,44);column(27,6,12,44);column(30,6,12,44);
  row(18,24,5,43);row(26,31,5,43);row(20,22,9,46);row(28,29,9,46);row(24,26,11,43);
  room(20,6,3,7,41);room(28,6,2,7,41);for(const x of [19,23,27])clear(x,10,1,3);
  guard(21,13);guard(25,11);guard(29,13);guard(21,9);guard(28.5,9);guard(21,5);heavy(29,5);
 }else if(level===8){
  clear(18,14,13,2);row(18,30,16,43);room(18,12,13,4,41);column(19,9,15,44);column(30,9,15,44);
  row(18,23,8,43);row(27,31,8,43);row(20,23,12,46);row(27,29,12,46);clear(19,13,1,3);
  guard(21,8);guard(29,8);guard(21,12);guard(28,12);guard(22,16);guard(27,16);heavy(25,16);
 }else{
  clear(18,14,13,2);row(18,30,16,43);room(18,12,13,4,41);
  column(19,6,15,44);column(30,6,15,44);row(18,23,5,43);row(27,31,5,43);row(20,23,10,46);row(27,29,10,46);
  row(24,26,8,43);column(24,6,7,44);column(26,6,7,44);row(24,26,5,43);clear(19,12,1,4);
  guard(21,5);guard(29,5);guard(21,10);guard(28,10);guard(25.5,8);guard(22,16);guard(28,16);heavy(25,16);
 }
 assignEndermanSpots(scene);return {...scene,...SIFT_LEVELS[level]};
}
