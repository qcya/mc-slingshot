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
  23:{name:'梯子后墙',sprite:'ladder_wall',hard:22,density:1.1,sound:'wood'},
  24:{name:'下界岩',sprite:'netherrack',hard:18,density:1.5,sound:'stone'},
  25:{name:'下界砖',sprite:'nether_bricks',hard:48,density:3,sound:'stone'},
  26:{name:'红色下界砖',sprite:'red_nether_bricks',hard:48,density:3,sound:'stone'},
  27:{name:'黑石',sprite:'blackstone',hard:45,density:3,sound:'stone'},
  28:{name:'磨制黑石砖',sprite:'polished_blackstone_bricks',hard:52,density:3,sound:'stone'},
  29:{name:'玄武岩',sprite:'basalt_side',hard:48,density:3,sound:'stone'},
  30:{name:'灵魂土',sprite:'soul_soil',hard:17,density:1.6,sound:'dirt'},
  31:{name:'绯红木板',sprite:'crimson_planks',hard:23,density:1.2,sound:'wood'},
  32:{name:'诡异木板',sprite:'warped_planks',hard:23,density:1.2,sound:'wood'},
  33:{name:'绯红菌柄',sprite:'crimson_stem',hard:28,density:1.5,sound:'wood'},
  34:{name:'诡异菌柄',sprite:'warped_stem',hard:28,density:1.5,sound:'wood'},
  35:{name:'荧石',sprite:'glowstone',hard:14,density:1.1,sound:'glass'},
  36:{name:'末地石',sprite:'end_stone',hard:42,density:2.8,sound:'stone'},
  37:{name:'末地石砖',sprite:'end_stone_bricks',hard:46,density:3,sound:'stone'},
  38:{name:'紫珀块',sprite:'purpur_block',hard:36,density:2.4,sound:'stone'},
  39:{name:'紫珀柱',sprite:'purpur_pillar',hard:40,density:2.6,sound:'stone'},
  40:{name:'黑曜石',sprite:'obsidian',hard:Infinity,density:5,sound:'stone'},
  41:{name:'筛板岩',sprite:'sift_siftslate',hard:48,density:3,sound:'deepslate'},
  42:{name:'覆生筛板岩',sprite:'sift_siftslate_growth_side',hard:35,density:2.8,sound:'deepslate'},
  43:{name:'筛板岩砖',sprite:'sift_siftslate_bricks',hard:48,density:3,sound:'deepslate'},
  44:{name:'雕纹筛板岩',sprite:'sift_chiseled_siftslate',hard:52,density:3,sound:'deepslate'},
  45:{name:'覆生柳木',sprite:'sift_overgrown_willow_log',hard:28,density:1.5,sound:'wood'},
  46:{name:'覆生柳木板',sprite:'sift_overgrown_willow_planks',hard:22,density:1.1,sound:'wood'},
  47:{name:'鲜活幽匿',sprite:'sift_healthy_sculk',hard:18,density:1.4,sound:'grass'},
  48:{name:'覆生柳叶',sprite:'sift_overgrown_willow_foliage',hard:6,density:.2,sound:'grass'},
  49:{name:'覆生柳藤',sprite:'sift_overgrown_willow_vines',hard:6,density:.2,sound:'grass'},
  50:{name:'覆生柳藤梢',sprite:'sift_overgrown_willow_vines_bottom',hard:6,density:.2,sound:'grass'}
};
export const isIndestructible=material=>MATERIALS[material]?.hard===Infinity;
export const AMMO=[
  {id:'cobble',label:'圆石',sprite:'cobblestone',size:28,mass:4,detail:'高速撞击 · 熔岩点燃后附带灼烧'},
  {id:'tnt',label:'TNT',sprite:'tnt_side',size:28,mass:2.4,detail:'四秒引信 · 碰撞仅碎玻璃'},
  {id:'ender',label:'末影珍珠',sprite:'ender_pearl',size:28,mass:1.1,detail:'无损穿两格墙 · 五秒后淡出，穿墙重新计时'},
  {id:'fire',label:'烈焰弹',sprite:'fire_charge',size:28,mass:1.2,detail:'持续灼烧 · 范围最宽五格'},
  {id:'slimeball',label:'黏液球',sprite:'slime_ball',size:28,mass:2.2,restitution:.88,detail:'高弹性反弹 · 每只生物只伤一次'},
  {id:'anvil',label:'铁砧',sprite:'anvil',size:42,mass:9,gravityScale:1.2,rangeScale:.95,liftScale:1.15,shape:'box',detail:'抛射重砸 · 逐层敲到基岩或黑曜石；硬目标头顶五秒后淡出'},
  {id:'wind',label:'风弹',sprite:'wind_charge',size:28,mass:.8,detail:'范围击退 · 不破坏地形'},
  {id:'crystal',label:'末地水晶',sprite:'end_crystal',size:28,mass:2.4,shape:'box',detail:'只在地面安放 · 其他弹药或风弹触发连锁爆炸'},
  {id:'trident',label:'三叉戟',sprite:'trident',size:28,mass:3,maxDurability:3,detail:'三次耐久 · 停住或出界后回收，往返伤敌'}
];
// Retain old simulation IDs for imported replays and regression fixtures only.
// These are no longer supplied or displayed in the nine-slot campaign.
export const PROJECTILES=[...AMMO,
 {id:'snowball',label:'雪球',sprite:'snowball',size:28,mass:.7},
 {id:'water',label:'喷溅型水瓶',sprite:'splash_water',size:28,mass:1}
];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
