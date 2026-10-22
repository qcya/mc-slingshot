import {PixelGrid} from './pixels.mjs';
import {RearLayer} from './rear.mjs';
import {TILE} from './config.mjs';

// The authoring grid is 32 × 18 complete blocks. Only stairs/slabs may use
// half blocks, and their actual collision pixels are marked for validation.
export function createLevelBuilder(dimension='overworld'){
 const grid=new PixelGrid(512,288),rear=new RearLayer(512,288);
 const visual={rooms:[],roofTiles:new Set(),gables:new Set(),attics:[]};
 const scene={dimension,grid,rear,visual,enemies:[],trees:[],lavaSources:[]};
 const tile=(x,y,m)=>grid.tile(x,y,m);
 const row=(x0,x1,y,m)=>{for(let x=x0;x<=x1;x++)tile(x,y,m);};
 const column=(x,y0,y1,m)=>{for(let y=y0;y<=y1;y++)tile(x,y,m);};
 const room=(x,y,w,h,m)=>{rear.room(x,y,w,h,m);visual.rooms.push({x:x*16,y:y*16,w:w*16,h:h*16});};
 const palette=dimension==='nether'?[24,24,27]:dimension==='end'?[36,36,37]:dimension==='sift'?[42,41,41]:[1,2,3];
 // End islands end above the void. The other dimensions retain their basement.
 for(let x=0;x<32;x++)for(let y=14;y<18;y++){const m=y===17?(dimension==='end'?0:7):palette[Math.min(y-14,2)];tile(x,y,m);rear.grid.tile(x,y,m===1?2:m);}
 const surface=(x,top,material=palette[0])=>{
  for(let y=Math.min(top,14);y<17;y++){
   const m=y<top?0:y===top?material:y<top+2?palette[1]:palette[2];tile(x,y,m);rear.grid.tile(x,y,m===1?2:m);
  }
 };
 const clear=(x,y,w,h)=>grid.fill(x*16,y*16,w*16,h*16,0);
 const enemy=(x,feet,skin='pillager',options={})=>{
  const height=skin==='warden'||skin==='enderman'?132:skin==='hoglin'?84:skin==='shulker'?48:92;
  scene.enemies.push({x:x*TILE,feet:feet*TILE,skin,height,...options});
 };
 const roof=(x0,x1,y,m=15,backing=10)=>buildPitchedRoof(grid,rear,visual,x0,x1,y,m,backing);
 const slab=(x0,x1,y,m)=>{
  grid.fill(x0*16,y*16+8,(x1-x0+1)*16,8,m);
  for(let x=x0;x<=x1;x++)visual.roofTiles.add(y*32+x);
 };
 const prop=(x,y,m)=>{
  if(!visual.rooms.some(r=>(x+.5)*16>=r.x&&(x+.5)*16<r.x+r.w&&(y+.5)*16>=r.y&&(y+.5)*16<r.y+r.h))return;
  if(!grid.get(x*16+8,(y+1)*16))return;
  for(let py=0;py<16;py++)for(let px=0;px<16;px++)if(grid.get(x*16+px,y*16+py))return;
  if(scene.enemies.some(e=>(x+1)*TILE>e.x-(e.skin==='hoglin'?45:e.skin==='warden'?29:16)&&x*TILE<e.x+(e.skin==='hoglin'?45:e.skin==='warden'?29:16)&&(y+1)*TILE>e.feet-e.height&&y*TILE<e.feet))return;
  rear.grid.tile(x,y,m);
 };
 const lava=(x,y,{flowing=false}={})=>{tile(x,y,0);if(!flowing)tile(x,y+1,27);scene.lavaSources.push({x,y,...(flowing?{flowing:true}:{})});};
 return {scene,grid,rear,visual,tile,row,column,room,surface,clear,enemy,roof,slab,prop,lava};
}

export function buildPitchedRoof(grid,rear,visual,x0,x1,y,material=15,backing=10){
 const base=(y+1)*16;
 for(let step=0;x0+step<=x1-step;step++){
  const left=x0+step,right=x1-step,top=y*16-step*8;
  for(const [tx,ascending] of left===right?[[left,null]]:[[left,true],[right,false]]){
   grid.fill(tx*16,top+8,16,8,material);
   if(ascending!==null)grid.fill(tx*16+(ascending?8:0),top,8,8,material);
   for(let ty=Math.floor(top/16);ty<=Math.floor((top+15)/16);ty++)visual.roofTiles.add(ty*32+tx);
   if(step)rear.grid.fill(tx*16,top+16,16,base-top-16,backing);
  }
 }
 for(const tx of [x0+1,x1-1]){grid.fill(tx*16,base-8,16,8,material);visual.roofTiles.add(y*32+tx);}
}

// Teleport destinations are authored from real standing surfaces, with a full
// 132 px body clearance and separation from every initial creature.
export function assignEndermanSpots(scene){
 const candidates=[];
 for(const feet of [14,13,12,11,10,9,8,7,6,16])for(const x of [18.5,20.5,22.5,24.5,26.5,28.5,30.5,16,14,12,10]){
  const wx=x*TILE,wy=feet*TILE;
  let clear=true;
  for(let px=wx-16;px<=wx+16&&clear;px+=3)for(let py=wy-132;py<wy;py+=3)if(scene.grid.get(px/3,py/3)){clear=false;break;}
  if(!clear||!scene.grid.get((wx-10)/3,wy/3)||!scene.grid.get((wx+10)/3,wy/3))continue;
  if(scene.enemies.some(e=>Math.abs(e.x-wx)<65&&Math.abs(e.feet-wy)<132))continue;
  if(candidates.some(p=>Math.hypot(p.x-wx,p.feet-wy)<75))continue;
  candidates.push({x:wx,feet:wy});
 }
 for(const e of scene.enemies)if(e.skin==='enderman')e.teleportSpots=candidates.slice(0,8).map(p=>({...p}));
}
