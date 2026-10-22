import {createLevelBuilder} from './level-builder.mjs';

export const OVERWORLD_LEVELS=[
 {title:'01 / 村庄石基小屋',desc:'打穿左窗，清理木屋中的守卫'},
 {title:'02 / 山岗石钟楼',desc:'越过土坡，依次瞄准塔顶和两层窗洞'},
 {title:'03 / 双山墙旅馆',desc:'上下客房与下沉地窖，保留低处入口'},
 {title:'04 / 掠夺者高架前哨',desc:'烧开木柱与护墙，攻击高架巡逻平台'},
 {title:'05 / 双塔城门',desc:'分配爆破，清理两座塔楼和门厅'},
 {title:'06 / 山坡锯木场',desc:'越过土坡，照顾木工房和装卸棚的分散守军'},
 {title:'07 / 峡谷驿桥',desc:'桥上岗亭、低处矿室与右侧桥头分路清理'},
 {title:'08 / 阶梯采石工坊',desc:'高台、木工房与地底矿道都有守军'},
 {title:'09 / 滴水洞堡',desc:'打开三格高洞口，集中火力对付监守者'},
 {title:'10 / 古城双井防线',desc:'从两道天井投入爆破，清理地下双监守者'}
];

export function buildOverworld(level){
 const b=createLevelBuilder(),{scene,grid,rear,row,column,tile,room,surface,clear,enemy,roof,slab,prop}=b;
 // Keep the accepted terrain challenges and each original creature's location.
 if(level===1)for(const [x,y] of [[11,13],[12,13],[13,12],[14,12],[15,13],[16,13]])surface(x,y);
 if(level===2){surface(12,15);surface(13,16);clear(14,14,15,2);room(14,14,15,2,5);}
 if(level===3)for(const [x,y] of [[12,15],[13,15],[14,16],[15,16],[16,15],[17,15]])surface(x,y);
 if(level===4)for(const [x,y] of [[10,13],[11,12],[12,12],[13,12],[14,13]])surface(x,y);
 if(level===5)for(const [x,y] of [[11,13],[12,12],[13,11],[14,11],[15,12],[16,13],[23,13],[24,12],[25,12],[26,12],[27,13]])surface(x,y);
 if(level===6){for(let x=15;x<=28;x++)surface(x,x<18||x>26?15:17);room(16,14,12,3,3);}
 if(level===7){for(let x=13;x<=16;x++)surface(x,13);clear(18,14,12,2);room(18,14,12,2,3);}
 if(level===8){
  clear(17,10,14,7);room(17,12,14,4,11);row(17,30,16,11);
  // A stepped rock ceiling follows the cave rather than a rectangular slab.
  row(17,30,11,3);row(18,29,10,3);row(19,28,9,1);
  column(17,12,15,11);for(let y=13;y<=15;y++)tile(17,y,6);column(30,12,15,11);
 }
 if(level===9){for(const [x,y] of [[11,13],[12,12],[13,12],[14,13]])surface(x,y);clear(18,14,13,2);room(18,13,13,3,11);row(18,30,16,11);}

 if(level===0){
  // Low, one-room cottage: stone footing, timber frame, shallow spruce gable.
  row(19,29,13,16);column(20,10,12,4);column(28,10,12,4);
  tile(20,11,6);tile(28,11,17);tile(28,12,18);roof(19,29,9);
  column(28,7,8,16);tile(28,6,5);room(21,10,7,3,10);
  enemy(23,13);prop(21,12,19);prop(24,12,20);prop(26,12,21);
 }else if(level===1){
  // The bell chamber, deep masonry foot and offset buttress read as one tower.
  row(22,29,13,16);column(23,5,12,5);column(28,5,12,5);column(29,10,12,16);
  row(24,27,9,10);row(22,29,4,5);for(const x of [22,24,27,29])tile(x,3,5);
  for(const y of [7,11]){tile(23,y,6);tile(28,y,6);}tile(23,12,16);tile(28,12,16);
  room(24,5,4,4,5);room(24,10,4,3,5);rear.grid.tile(24,10,4);rear.grid.tile(24,11,4);
  enemy(25.5,4);enemy(26,9);enemy(25.5,13,'zombie');prop(24,12,20);prop(27,8,21);
 }else if(level===2){
  // A paired-gable inn keeps two broad rooms above the original open cellar.
  row(19,29,13,16);column(19,7,12,4);column(29,7,12,4);row(20,28,10,10);
  roof(18,24,6,15);roof(24,30,6,15);for(const y of [8,11])tile(19,y,6);
  tile(29,8,6);tile(29,11,17);tile(29,12,18);room(20,7,9,3,10);room(20,11,9,2,10);
  column(29,14,15,5);row(19,29,16,3);
  enemy(22,10);enemy(27,10);enemy(23,16,'zombie');enemy(27,13,'zombie');
  prop(20,12,19);prop(21,12,20);prop(28,12,21);prop(20,9,21);prop(28,9,19);prop(21,15,20);prop(27,15,21);
 }else if(level===3){
  column(22,6,13,12);column(27,6,13,12);row(20,29,10,13);roof(20,29,5,13,13);
  // Open log stilts have no fake second support drawn behind them.
  for(const x of [22,27]){tile(x,8,6);tile(x,9,6);}tile(20,9,12);tile(29,9,12);
  // A roof over the lower bay shades the full zombie patrol corridor.
  room(23,6,4,4,13);column(20,11,13,12);column(29,11,13,12);
  enemy(23.7,10);enemy(26.2,10);enemy(29.4,10,'pillager',{stationary:true});enemy(24.5,14,'zombie');
  // The stationary balcony guard occupies the outer half of its floor tile.
  tile(29,9,0);prop(23,9,21);prop(26,9,19);
 }else if(level===4){
  row(19,30,13,5);for(const x of [19,21,28,30])column(x,7,12,5);
  row(19,21,6,5);row(28,30,6,5);for(const x of [19,21,28,30])tile(x,5,5);
  row(22,27,10,5);column(22,11,12,16);column(27,11,12,16);
  // Short exterior buttresses frame the open, lower entrance.
  tile(18,12,16);tile(31,12,16);tile(19,10,6);tile(30,10,6);
  for(const x of [19,21]){tile(x,11,6);tile(x,12,6);}tile(22,11,17);tile(22,12,18);
  room(20,7,1,6,5);room(29,7,1,6,5);room(23,11,4,2,5);
  enemy(20.5,6,'pillager',{stationary:true});enemy(29.5,6,'pillager',{stationary:true});enemy(25,10);enemy(24,13,'zombie');enemy(26,13,'zombie');
  prop(20,12,20);prop(29,12,21);prop(23,12,19);prop(25,12,20);
 }else if(level===5){
  row(18,23,13,10);column(17,9,12,4);column(18,9,12,4);column(23,9,12,4);tile(18,11,6);roof(17,24,8,15);
  // The low shed stays distinct from the gabled sawmill and follows the hillside.
  row(25,30,9,15);column(25,10,13,14);column(30,10,13,14);slab(24,30,8,15);
  room(19,9,4,4,10);room(26,10,4,4,15);
  enemy(20,13,'zombie');enemy(22.5,13);enemy(26,9);enemy(29,14,'zombie');enemy(27.5,9);
  // Keep the roof-top pair clear of the decorative half-height overhang.
  clear(25,8,4,1);for(let x=25;x<=28;x++)scene.visual.roofTiles.delete(8*32+x);
  prop(19,12,19);prop(21,12,20);prop(28,13,21);
 }else if(level===6){
  row(18,29,9,15);column(18,10,16,14);column(29,10,14,14);
  column(22,6,8,4);column(27,6,8,4);roof(21,28,5,15);tile(22,7,6);tile(27,7,6);
  row(19,25,16,16);row(28,30,13,16);column(19,12,15,16);tile(19,14,6);tile(19,15,6);
  row(20,25,12,16);room(23,6,4,3,15);room(20,13,6,3,3);
  // The river-level room has a real stone ceiling over both underground zombies.
  enemy(23.5,9);enemy(26,9);enemy(20.5,16,'zombie');enemy(24.5,16,'zombie');enemy(28.5,13,'pillager',{stationary:true});
  prop(23,8,21);prop(22,15,20);
 }else if(level===7){
  row(18,21,10,5);column(18,11,13,5);column(21,11,13,5);
  row(25,30,7,16);column(25,8,8,16);column(29,8,15,3);column(30,8,13,5);
  row(22,28,13,15);column(22,10,12,14);column(28,10,12,14);row(22,28,9,15);tile(22,11,6);
  row(18,29,16,3);column(18,14,15,5);tile(18,14,6);tile(18,15,6);
  // A canopy over the left mine and the machine floor cover the whole gallery.
  row(19,21,13,16);room(23,10,5,3,15);
  enemy(19.5,10);enemy(26,7);enemy(29,7);enemy(25,13);enemy(21,16,'zombie');enemy(27,16,'zombie');
  prop(23,12,19);prop(26,12,20);prop(23,15,20);
 }else if(level===8){
  row(20,24,7,16);column(20,8,8,5);column(24,8,8,5);room(21,8,3,1,5);
  // Natural stepped outside walls remain thin at the playable cave entrance.
  tile(16,12,16);tile(31,12,16);tile(18,10,16);tile(29,10,16);
  enemy(21.5,7);enemy(27,9);enemy(20,16,'zombie');enemy(24.5,16,'warden');enemy(28.5,16);
  prop(22,15,20);prop(29,15,21);
 }else{
  // Two towers and separate light wells surround a low timber center hall.
  row(18,30,12,5);for(const x of [21,22,23,26,27,28])tile(x,12,0);
  column(18,7,11,5);column(30,7,11,5);row(19,20,6,5);row(29,30,6,5);
  tile(18,5,5);tile(30,5,5);for(const y of [9,10]){tile(18,y,6);tile(30,y,6);}
  row(24,25,7,13);column(30,13,15,11);for(const x of [20,24,25,29])column(x,14,15,11);
  room(19,7,2,5,5);room(24,8,2,4,13);room(29,7,1,5,5);
  // The zombie remains on the covered central two-block balcony.
  enemy(19.5,6,'pillager',{stationary:true});enemy(29.5,6,'pillager',{stationary:true});enemy(24.5,12);enemy(25.5,12,'zombie');enemy(21.5,16);enemy(22.5,16,'warden');enemy(27.5,16,'warden');enemy(28.5,16);
  prop(20,11,21);prop(29,11,20);prop(19,15,19);
 }
 scene.trees=[{x:31,base:14,height:5,kind:'cherry'}];
 return {...scene,...OVERWORLD_LEVELS[level]};
}
