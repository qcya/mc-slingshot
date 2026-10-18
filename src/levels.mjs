import { PixelGrid } from './pixels.mjs';
import { TILE } from './config.mjs';
import {RearLayer} from './rear.mjs';
import {LOADOUTS} from './campaign.mjs';
export const LEVELS=[
  {title:'01 / 村庄小木屋',desc:'击碎窗户，让弹药进入房间'},
  {title:'02 / 石质哨塔',desc:'穿过窗户，瞄准不同高度的守卫'},
  {title:'03 / 双层村庄建筑',desc:'注意入口下方的地窖与守卫'},
  {title:'04 / 掠夺者前哨站',desc:'穿过木墙，攻击高架平台上的守卫'},
  {title:'05 / 小型堡垒',desc:'爆破打开射界，利用爆炸推动其他弹药'},
  {title:'06 / 山坡伐木场',desc:'越过土坡，在屋顶与木屋之间分配圆石和爆破'},
  {title:'07 / 峡谷吊桥',desc:'高低两路守军，桥板仍会固定在原位'},
  {title:'08 / 采石场工坊',desc:'穿过石窗，清理台地、工坊和地下矿道'},
  {title:'09 / 幽深洞窟',desc:'监守者需要反复重击；先打开洞口再集中火力'},
  {title:'10 / 古城最后防线',desc:'分层堡垒与双监守者，有限弹药考验整场规划'}
];

export function buildLevel(number){
  const level=Math.max(0,Math.min(LEVELS.length-1,Math.trunc(Number(number))||0)),grid=new PixelGrid(512,288),rear=new RearLayer(512,288),enemies=[];
  const visual={rooms:[],roofTiles:new Set(),gables:new Set(),attics:[],facings:new Map(),gableMaterials:[]};
  const room=(x,y,w,h,m)=>{rear.room(x,y,w,h,m);visual.rooms.push({x:x*16,y:y*16,w:w*16,h:h*16});};
  const row=(x0,x1,y,m)=>{for(let x=x0;x<=x1;x++)grid.tile(x,y,m);};
  const column=(x,y0,y1,m)=>{for(let y=y0;y<=y1;y++)grid.tile(x,y,m);};
  const tile=(x,y,m)=>grid.tile(x,y,m);
  const enemy=(x,y,skin='pillager',options={})=>enemies.push({x:x*TILE,feet:y*TILE,skin,height:skin==='warden'?132:92,...options});
  const roof=(x0,x1,y,m=10)=>{
    const sections=[];
    const gableMaterial=level===3?15:10,roofMaterial=13;
    visual.attics.push({center:(x0+x1+1)*8,base:(y+1)*16,left:x0*16,right:(x1+1)*16});
    const roofRow=(a,b,ty)=>{row(a,b,ty,m);for(let tx=a;tx<=b;tx++)visual.roofTiles.add(ty*32+tx);};
    for(let step=0;x0+step<=x1-step;step++){
      const left=x0+step,right=x1-step;
      if(right-left<=2){roofRow(left,right,y-step);break;}
      roofRow(left,left+1,y-step);roofRow(right-1,right,y-step);
      sections.push({x:left+2,y:y-step,w:right-left-3});
    }
    // The gable rear wall stays fixed just like the remaining foreground.
    for(const part of sections)if(part.w>0){rear.room(part.x,part.y,part.w,1,m);visual.gableMaterials.push({...part,m:gableMaterial});}
    // A narrow stair/slab roof edge surrounds the lighter gable. This is a
    // material facing only: the original full-block impact envelope stays put.
    for(let py=0;py<(y+1)*16;py++)for(let px=x0*16;px<(x1+1)*16;px++){
      if(!visual.roofTiles.has((py>>4)*32+(px>>4)))continue;
      const step=y-(py>>4),left=(x0+step)*16,right=(x1-step+1)*16;
      const edge=px<left+6||px>=right-6||((py&15)<7&&(px<left+16||px>=right-16));
      visual.facings.set(py*512+px,{m:edge?roofMaterial:gableMaterial,light:edge?.92:.73});
    }
  };
  for(let x=0;x<32;x++){tile(x,14,1);tile(x,15,2);tile(x,16,3);tile(x,17,7);rear.grid.tile(x,14,2);rear.grid.tile(x,15,2);rear.grid.tile(x,16,3);rear.grid.tile(x,17,7);}
  // Entire 16x16 blocks form the playable terrain, including every step.
  const surface=(x,top)=>{
    for(let y=Math.min(top,14);y<17;y++){tile(x,y,y<top?0:y===top?1:y<top+2?2:3);rear.grid.tile(x,y,y<top?0:y<top+2?2:3);}
  };
  if(level===1)for(const [x,y] of [[11,13],[12,13],[13,12],[14,12],[15,13],[16,13]])surface(x,y);
  if(level===2){
    // Descending entrance, with a two-block-high cellar below the house.
    surface(12,15);surface(13,16);
    for(let x=14;x<=28;x++)for(let y=14;y<=15;y++)tile(x,y,0);
    room(19,14,10,2,5);rear.grid.tile(21,15,20);rear.grid.tile(27,15,21);
  }
  if(level===3)for(const [x,y] of [[12,15],[13,15],[14,16],[15,16],[16,15],[17,15]])surface(x,y);
  if(level===4)for(const [x,y] of [[10,13],[11,12],[12,12],[13,12],[14,13]])surface(x,y);
  if(level===5)for(const [x,y] of [[11,13],[12,12],[13,11],[14,11],[15,12],[16,13],[23,13],[24,12],[25,12],[26,12],[27,13]])surface(x,y);
  if(level===6){
    for(let x=15;x<=28;x++)surface(x,x<18||x>26?15:17);
    room(16,14,12,3,3);
  }
  if(level===7){
    for(let x=13;x<=16;x++)surface(x,13);
    for(let x=18;x<=29;x++)for(let y=14;y<=15;y++)tile(x,y,0);
    room(18,14,12,2,3);
  }
  if(level===8){
    for(let x=17;x<=30;x++){
      for(let y=10;y<=16;y++)tile(x,y,y===16?11:y<=11?3:0);
      rear.room(x,12,1,4,11);
    }
    // The open three-block entrance fits the taller guardian.
    column(17,12,15,11);tile(17,13,6);tile(17,14,6);tile(17,15,6);
    column(30,12,15,11);row(18,29,9,1);
  }
  if(level===9){
    for(const [x,y] of [[11,13],[12,12],[13,12],[14,13]])surface(x,y);
    for(let x=18;x<=30;x++)for(let y=14;y<=15;y++)tile(x,y,0);
    room(18,13,13,3,11);row(18,30,16,11);
  }
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
    // An oak pier divides the lower room behind its fragile entry window.
    column(24,10,12,4);
    enemy(25.5,4);enemy(26,9);enemy(25.5,13,'zombie');
    room(24,5,4,4,5,9,[23,4,29,10]);room(24,10,4,3,5,13,[23,9,29,14]);
  }else if(level===2){
    row(19,29,13,16);column(19,7,12,4);column(29,7,12,4);
    row(20,28,10,10);roof(18,30,6,15);
    tile(19,8,6);tile(29,8,6);tile(19,11,6);tile(29,11,6);
    tile(29,11,17);tile(29,12,18);
    enemy(22,10);enemy(27,10);enemy(23,16,'zombie');enemy(27,13,'zombie');
    room(20,7,9,3,10,10,[19,6,30,11]);room(20,11,9,2,10,13,[19,10,30,14]);
  }else if(level===3){
    column(22,6,13,12);column(27,6,13,12);row(20,29,10,13);
    roof(20,29,5,13);tile(21,9,12);tile(28,9,12);
    // Corner piers carry the watch deck and enclose the open ground-floor bay.
    rear.room(22,11,1,3,12);rear.room(27,11,1,3,12);
    for(const x of [22,27]){tile(x,8,6);tile(x,9,6);}
    enemy(23.7,10);enemy(26.2,10);enemy(29.4,10,'pillager',{stationary:true});enemy(24.5,14,'zombie');
    room(23,6,4,4,13,10,[22,5,28,11]);
  }else if(level===4){
    row(19,30,13,5);for(const x of [19,21,28,30])column(x,7,12,5);
    row(19,21,6,5);row(28,30,6,5);for(const x of [19,21,28,30])tile(x,5,5);
    row(22,27,10,5);column(22,11,12,16);column(27,11,12,16);
    tile(19,10,6);tile(30,10,6);
    for(const x of [19,21]){tile(x,11,6);tile(x,12,6);}tile(22,11,17);tile(22,12,18);
    enemy(20.5,6,'pillager',{stationary:true});enemy(29.5,6,'pillager',{stationary:true});enemy(25,10);enemy(24,13,'zombie');enemy(26,13,'zombie');
    room(20,7,1,6,5,13,[19,6,22,14]);room(29,7,1,6,5,13,[28,6,31,14]);room(23,11,4,2,5,13,[22,10,28,14]);
  }else if(level===5){
    // Split hillside targets prevent one blast from clearing the entire camp.
    row(18,23,13,10);column(17,9,12,4);column(18,9,12,4);column(23,9,12,4);tile(18,11,6);roof(17,24,8,15);
    // A continuous log-supported loading shelter opens toward the low guard.
    row(25,30,9,15);column(25,10,13,14);column(30,10,13,14);
    room(19,9,4,4,15);room(26,10,4,4,10);
    // Stacked cut logs distinguish the loading yard from the dwelling.
    rear.room(26,12,2,2,14);
    enemy(20,13,'zombie');enemy(22.5,13);enemy(26,9);enemy(29,14,'zombie');enemy(27.5,9);
  }else if(level===6){
    // A fixed timber bridge crosses the deep ravine; breaking it creates a hole.
    row(18,29,9,15);column(18,10,16,14);column(29,10,14,14);
    column(22,6,8,4);column(27,6,8,4);roof(21,28,5,15);tile(22,7,6);tile(27,7,6);
    // The bridge rests on timber abutments and a visible rear crossbeam.
    rear.room(19,10,10,1,14);
    row(19,25,16,16);row(28,30,13,16);column(19,12,15,16);tile(19,14,6);tile(19,15,6);
    room(23,6,4,3,15);room(19,12,7,4,3);
    enemy(23.5,9);enemy(26,9);enemy(20.5,16,'zombie');enemy(24.5,16,'zombie');enemy(28.5,13,'pillager',{stationary:true});
  }else if(level===7){
    // Open quarry ledges, a wooden machine room, and a low mine gallery.
    row(18,21,10,5);column(18,11,13,5);column(21,11,13,5);
    row(25,30,7,16);column(25,8,8,16);column(29,8,15,3);column(30,8,13,5);
    // A dressed quarry face carries the upper working ledge down to the mine.
    rear.room(29,8,1,8,3);
    row(22,28,13,15);column(22,10,12,14);column(28,10,12,14);row(22,28,9,15);tile(22,11,6);
    row(18,29,16,3);column(18,14,15,5);tile(18,14,6);tile(18,15,6);
    room(23,10,5,3,15);
    enemy(19.5,10);enemy(26,7);enemy(29,7);enemy(25,13);enemy(21,16,'zombie');enemy(27,16,'zombie');
  }else if(level===8){
    // A roof sentry and cave guards protect the first three-hit guardian.
    row(20,24,7,16);column(20,8,8,5);column(24,8,8,5);
    rear.room(21,8,3,1,5);
    enemy(21.5,7);enemy(27,9);enemy(20,16,'zombie');enemy(24.5,16,'warden');enemy(28.5,16);
  }else{
    // Stone towers cover a timber hall above a spacious three-block crypt.
    row(18,30,12,5);for(const x of [21,22,23,26,27,28])tile(x,12,0);column(18,7,11,5);column(30,7,11,5);
    tile(19,6,5);tile(29,6,5);tile(18,9,6);tile(18,10,6);tile(30,9,6);
    // The central bridge has its own canopy; the two wider side intakes stay
    // open all the way to the sky so a normal lob drops into either boss area.
    row(24,25,7,13);
    // A generous open crypt entrance and low dividers keep both guardians in
    // separate blast areas instead of making success depend on a patrol phase.
    column(30,13,15,11);for(const x of [20,24,25,29])column(x,14,15,11);
    room(19,7,3,5,5);room(23,8,4,4,13);room(28,7,2,5,5);
    // The open intake is guarded by a pillager; the zombie stays under the canopy.
    enemy(19.5,6,'pillager',{stationary:true});enemy(29.5,6,'pillager',{stationary:true});enemy(24.5,12);enemy(25.5,12,'zombie');enemy(21.5,16);enemy(22.5,16,'warden');enemy(27.5,16,'warden');enemy(28.5,16);
  }
  // Furniture lives in the destructible rear layer, outside the firing plane.
  const furniture=[[[21,12,19],[22,12,20],[26,12,21]],[[24,12,20],[27,8,21]],[[20,12,19],[21,12,20],[28,12,21],[20,9,21],[27,9,19]],[[23,9,21],[26,9,19]],[[20,12,20],[29,12,21],[23,12,19],[26,12,20]],[[19,12,19],[22,12,20],[28,11,21]],[[23,8,21],[20,15,20]],[[23,12,19],[26,12,20],[28,15,9]],[[19,15,9],[29,15,9]],[[20,11,21],[25,11,19],[28,15,20]]][level];
  for(const [x,y,m] of furniture)rear.grid.tile(x,y,m);
  for(const a of visual.attics){
    const ladderX=Math.floor(a.right/16)-3,from=Math.floor(a.left/16)+2;
    const room=visual.rooms.find(r=>r.y===a.base&&ladderX*16>=r.x&&ladderX*16<r.x+r.w);
    if(!room)continue;
    for(let tx=from;tx<ladderX;tx++)rear.grid.fill(tx*16,a.base-8,16,8,22);
    for(let ty=Math.floor(a.base/16)-1;ty<(room.y+room.h)/16;ty++)rear.grid.tile(ladderX,ty,23);
  }
  dressArchitecture(level,{rear,visual});
  // Background objects never enter the destructible/support grid.
  const trees=[{x:31,base:14,height:5,kind:'cherry'}];
  return {...LEVELS[level],shots:LOADOUTS[level].reduce((a,b)=>a+b,0),number:level,grid,rear,enemies,trees,visual};
}

// Architectural facings follow the damageable rear wall. Their dimensions are
// in texture pixels, so sills, lintels and slabs read as Minecraft building parts
// instead of arbitrary full-block beams. They never create impact/support bodies.
function dressArchitecture(level,{rear:physicalRear,visual}){
  const rear={grid:new PixelGrid(512,288)};rear.grid.cells.set(physicalRear.grid.cells);
  visual.rearPaint=rear.grid;
  for(const part of visual.gableMaterials)rear.grid.fill(part.x*16,part.y*16,part.w*16,16,part.m);
  const fill=(x,y,w,h,m)=>rear.grid.fill(x*16,y*16,w*16,h*16,m);
  const cap=(x,y,w,m=14)=>fill(x,y,w,.25,m);
  const window=(x,y,w=1,h=1,trim=14)=>{
    fill(x-.125,y-.125,w+.25,h+.25,trim);fill(x,y,w,h,[5,11,16].includes(trim)?11:17);
    fill(x-.25,y+h,w+.5,.1875,trim);
    if(w>1)fill(x+w/2-.0625,y,.125,h,trim);
  };
  const ladder=(x,y,h)=>{for(let i=0;i<h;i++)rear.grid.tile(x,y+i,23);};
  const arch=(x,y,w,h,m=5)=>{
    fill(x,y,w,h,m);fill(x+.25,y+.5,w-.5,h-.5,11);
    fill(x+.5,y+.25,w-1,.25,11);
  };
  // Expose the floor divisions and give the cutaway wall a continuous plinth.
  for(const r of visual.rooms){
    if(r.y>=224)continue;
    cap(r.x/16,r.y/16,r.w/16,level===1||level===4||level===9?5:14);
    fill(r.x/16,(r.y+r.h)/16-.1875,r.w/16,.1875,level===1||level===4||level===9?16:14);
  }
  if(level===0){
    window(22,10.75,1.25,1);window(25.5,10.75,1.25,1);
    window(24,7.75,1,1,15);cap(20,9.75,9,14);
    fill(21,12.75,7,.25,14);
  }else if(level===1){
    // Machicolated stone watchtower, with narrow paired lookout slits.
    for(const x of [24.625,26.375])window(x,6.25,.5,1.5,5);
    window(25.5,10.25,.75,1,5);ladder(27,5,8);
    cap(22,4.75,8,16);cap(23,9,6,16);
    fill(24,4.25,4,.25,16);
  }else if(level===2){
    window(21,7.75,1.25,1.25);window(26,7.75,1.25,1.25);
    window(23.75,11.25,1.25,1);window(23.5,4.5,1.5,1,15);
    cap(19,10.75,11,14);ladder(28,7,6);
    fill(19,13.875,10,.125,16);fill(19,14,.25,2,5);fill(28.75,14,.25,2,5);
    for(const x of [21,25])arch(x,14.25,1.5,1.5);
  }else if(level===3){
    window(23.25,6.75,1,1.5,12);window(25,6.75,1,1.5,12);
    cap(20,10,10,12);cap(22,5.75,6,12);ladder(26,6,4);
    // A balcony rail uses a top rail and spaced uprights, leaving the bay open.
    for(const x of [20.25,21.25,28.25,29.25])fill(x,9.25,.125,.75,12);
    cap(20,9.25,2,12);cap(28,9.25,2,12);
    fill(22,13.75,6,.25,16);
  }else if(level===4){
    // The keep's narrow tower rooms receive arrow loops, stone corbels and a
    // recessed gate arch, while the actual blast opening stays unchanged.
    for(const x of [20.3125,29.3125]){window(x,7.75,.375,1.5,5);window(x,10.25,.375,1.25,5);}
    arch(23,10.25,4,2.75);window(24.5,11,.75,1.25,16);
    cap(19,6.75,3,16);cap(28,6.75,3,16);cap(22,10.75,6,16);
    for(const x of [19,21,28,30])fill(x,6.5,.5,.5,16);
  }else if(level===5){
    window(19.5,9.75,1,1.25);window(21.5,9.75,1,1.25);
    cap(17,8.75,7.5,14);ladder(22,9,4);
    // The loading shelter is airy: upright posts, a shallow fascia and stacked
    // log ends, rather than a second house with a solid wall.
    fill(26,10,4,2,13);cap(25,9.75,6,14);
    for(const x of [26,28])fill(x,10,.1875,3.75,14);
    fill(26,12.75,2,1.25,14);window(28.5,11.5,.75,.75,14);
  }else if(level===6){
    window(23.5,6.75,1,1.25,14);window(25.5,6.75,1,1.25,14);
    cap(21,5.75,8,14);cap(18,9.75,12,14);
    for(const x of [19,20,21,28]){fill(x,8.25,.125,.75,14);}
    cap(18,8.25,4,14);cap(28,8.25,2,14);
    // Dressed rock at the cellar mouth and mine supports ground the bridge.
    for(const x of [20,24]){fill(x,12,.25,4,14);cap(x,12,1.5,14);}
    fill(19,15.75,7,.25,16);ladder(25,12,4);
  }else if(level===7){
    window(23,10.75,1,1.25,14);window(26,10.75,1,1.25,14);
    cap(22,9.75,7,14);ladder(27,10,3);
    // Half-slab shed eaves and a timber gantry give the quarry its workshop
    // silhouette; underground bracing follows the continuous rock gallery.
    fill(21.75,9.5,7.5,.25,15);
    for(const x of [20,24,28]){fill(x,14,.25,2,14);cap(x,14,2,14);}
    fill(29,8,.25,8,16);cap(25,7.75,6,16);
  }else if(level===8){
    // An old stone checkpoint sits in a grass-topped cave face, with natural
    // rock and a tall recessed guardian chamber rather than a timber house.
    cap(20,7.75,5,16);arch(21,8,3,1,5);
    for(const x of [19,29]){fill(x,12,.5,4,11);cap(x,12,1.5,11);}
    for(const [x,y,w] of [[18,12,2],[22,12,3],[27,12,3]])fill(x,y,w,.25,3);
    for(const x of [18.5,29.25])window(x,13,.5,1.5,11);
    fill(20,15.75,9,.25,11);
  }else{
    // Ruined towers get broken parapets and arrow loops. Both open sky intakes
    // above the wardens stay completely clear in the foreground.
    for(const [x,w] of [[19,3],[28,2]]){
      cap(x,7,w,11);window(x+.75,8.25,.5,1.5,5);
      fill(x,10.5,w,.25,11);fill(x,11.75,w,.25,16);
    }
    fill(19,6.625,3,.375,5);fill(20.75,6.125,.75,.5,5);
    fill(28,6.625,2,.375,5);fill(28.25,6.25,.5,.375,5);
    window(24,8.75,2,1.25,12);cap(23,7.75,4,12);
    for(const x of [19,23.5,28.5]){fill(x,13,.25,3,5);cap(x,13,1.5,5);}
    for(const x of [21.25,26.5])arch(x,13.5,2.25,2.5,11);
  }
}
