export const WIDTH=1536, HEIGHT=864, PIXEL=3, BLOCK=16, TILE=48, GROUND=224;
// Hardness is per texture pixel. Density is converted to Matter mass / area.
export const MATERIALS={
  1:{name:'草方块',sprite:'grass_block_side',hard:12,density:1.4,sound:'grass'},
  2:{name:'泥土',sprite:'dirt',hard:17,density:1.6,sound:'dirt'},
  3:{name:'石头',sprite:'stone',hard:48,density:3.1,sound:'stone'},
  4:{name:'橡木原木',sprite:'oak_log',hard:28,density:1.5,sound:'wood'},
  5:{name:'石砖',sprite:'stone_bricks',hard:52,density:3.0,sound:'stone'},
  6:{name:'玻璃',sprite:'glass',hard:8,density:.7,sound:'glass'},
  7:{name:'基岩',sprite:'bedrock',hard:Infinity,density:5,sound:'stone'},
  8:{name:'橡树叶',sprite:'oak_leaves',hard:6,density:.2,sound:'grass'},
  9:{name:'铁矿石',sprite:'iron_ore',hard:56,density:3.5,sound:'stone'},
  10:{name:'橡木板',sprite:'oak_planks',hard:22,density:1.1,sound:'wood'},
  11:{name:'深板岩',sprite:'deepslate',hard:64,density:3.8,sound:'deepslate'},
  12:{name:'深色橡木',sprite:'dark_oak_log',hard:30,density:1.6,sound:'wood'},
  13:{name:'深色橡木板',sprite:'dark_oak_planks',hard:24,density:1.2,sound:'wood'},
  14:{name:'云杉原木',sprite:'spruce_log',hard:28,density:1.5,sound:'wood'},
  15:{name:'云杉木板',sprite:'spruce_planks',hard:23,density:1.2,sound:'wood'},
  16:{name:'圆石',sprite:'cobblestone',hard:45,density:3,sound:'stone'},
  17:{name:'木门上半',sprite:'oak_door_top',hard:18,density:.8,sound:'wood'},
  18:{name:'木门下半',sprite:'oak_door_bottom',hard:18,density:.8,sound:'wood'},
  19:{name:'工作台',sprite:'crafting_table_front',hard:22,density:1.1,sound:'wood'},
  20:{name:'熔炉',sprite:'furnace_front',hard:48,density:3.1,sound:'stone'},
  21:{name:'书架',sprite:'bookshelf',hard:22,density:1.1,sound:'wood'},
  22:{name:'橡木台阶',sprite:'oak_planks',hard:22,density:1.1,sound:'wood'},
  23:{name:'梯子后墙',sprite:'ladder_wall',hard:22,density:1.1,sound:'wood'}
};
export const AMMO=[
  {id:'cobble',label:'圆石',sprite:'cobblestone',size:28,mass:4,detail:'实心方块 · 冲量撞击'},
  {id:'tnt',label:'TNT',sprite:'tnt_side',size:28,mass:2.4,detail:'四秒引信 · 碰撞仅碎玻璃'},
  {id:'ender',label:'末影珍珠',sprite:'ender_pearl',size:28,mass:1.1,detail:'只伤生物 · 无损穿薄墙'}
];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
