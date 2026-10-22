import {heavyMob,fireImmune,damageEnemy,thawEnemy} from './combat.mjs';
import {burnBucketEnemy} from './fire.mjs';

// Exact convex-part overlap keeps rotated debris and thin fragments watertight.
function overlapsCell(vertices,left,top,size){
 const right=left+size,bottom=top+size,axes=[{x:1,y:0},{x:0,y:1}];
 for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length];axes.push({x:a.y-b.y,y:b.x-a.x});}
 for(const a of axes){
  let lo=Infinity,hi=-Infinity;for(const v of vertices){const p=v.x*a.x+v.y*a.y;lo=Math.min(lo,p);hi=Math.max(hi,p);}
  const p=left*a.x+top*a.y,q=right*a.x+top*a.y,r=left*a.x+bottom*a.y,s=right*a.x+bottom*a.y;
  if(hi<=Math.min(p,q,r,s)+1e-7||lo>=Math.max(p,q,r,s)-1e-7)return false;
 }return true;
}
// Bounded fluid cells follow foreground pixels. Stable lava permits round loss.
export class LavaField{
 constructor(world,sources=[]){this.world=world;this.size=world.s*4;this.cells=new Map();this.sources=sources.map((p,i)=>({x:Math.floor(p.x)*4,y:Math.floor(p.y)*4,id:i,active:true,potent:false}));this.bucketSources=new Map();this.bucketSerial=0;this.nextAt=0;this.settling=false;this.revision=0;}
 clear(gx,gy){
  const w=this.world;if(gx<0||gy<0||(gx+1)*4>w.grid.width||(gy+1)*4>w.grid.height)return false;
  for(let y=gy*4;y<gy*4+4;y++)for(let x=gx*4;x<gx*4+4;x++)if(w.grid.get(x,y))return false;
  const left=gx*this.size,top=gy*this.size;
  for(const e of w.debris){
   if(e.dead)continue;const b=e.body.bounds;
   if(b.max.x<=left||b.min.x>=left+this.size||b.max.y<=top||b.min.y>=top+this.size)continue;
   for(const part of e.body.parts.length>1?e.body.parts.slice(1):e.body.parts)if(overlapsCell(part.vertices,left,top,this.size))return false;
  }return true;
 }
 pourBucket(x,y,{normal={x:0,y:-1},sourceId,enemy}={}){
  sourceId??=`bucket:${++this.bucketSerial}`;
  if(enemy)burnBucketEnemy(this.world,enemy,sourceId);
  if(this.bucketSources.has(sourceId))return this.bucketSources.get(sourceId);
  this.bucketSources.set(sourceId,null);
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>this.world.width||y>this.world.height)return null;
  const nx=Number.isFinite(normal?.x)?normal.x:0,ny=Number.isFinite(normal?.y)?normal.y:-1;
  const dx=Math.abs(nx)>Math.abs(ny)?Math.sign(nx):0,dy=dx?0:Math.sign(ny)||-1;
  const extent=4*this.size,gx=dx<0?Math.floor((x-extent)/this.size):dx>0?Math.ceil(x/this.size):Math.round((x-extent/2)/this.size),
   gy=dy<0?Math.floor((y-extent)/this.size):dy>0?Math.ceil(y/this.size):Math.round((y-extent/2)/this.size),choices=[];
  // Keep the 48px footprint at the impact. Tight cavities clip it rather than
  // moving the source through a nearby wall in search of a whole empty square.
  for(let oy=0;oy<4;oy++)for(let ox=0;ox<4;ox++)if(this.clear(gx+ox,gy+oy))choices.push({x:gx+ox,y:gy+oy});
  choices.sort((a,b)=>((a.x+.5)*this.size-x)**2+((a.y+.5)*this.size-y)**2-((b.x+.5)*this.size-x)**2-((b.y+.5)*this.size-y)**2||a.y-b.y||a.x-b.x);
  if(!choices.length)return null;
  const available=new Map(choices.map(p=>[`${p.x}:${p.y}`,p])),seedCells=[choices[0]],seen=new Set([`${choices[0].x}:${choices[0].y}`]);
  for(let i=0;i<seedCells.length;i++)for(const [ox,oy]of [[-1,0],[1,0],[0,-1],[0,1]]){
   const p=seedCells[i],k=`${p.x+ox}:${p.y+oy}`;if(available.has(k)&&!seen.has(k)){seen.add(k);seedCells.push(available.get(k));}
  }
  const source={x:gx,y:gy,id:sourceId,active:true,potent:true,seedCells};this.sources.push(source);this.bucketSources.set(sourceId,source);
  this.world.events.push({type:'fire',x,y,sound:'bucket_empty_lava'});
  this.nextAt=0;this.settling=true;return source;
 }
 touchesCircle(x,y,radius){
  // Query only the few fluid cells covered by this projectile's diameter.
  const minX=Math.max(0,Math.floor((x-radius)/this.size)),maxX=Math.min(Math.ceil(this.world.width/this.size)-1,Math.floor((x+radius)/this.size));
  const minY=Math.max(0,Math.floor((y-radius)/this.size)),maxY=Math.min(Math.ceil(this.world.height/this.size)-1,Math.floor((y+radius)/this.size));
  for(let gy=minY;gy<=maxY;gy++)for(let gx=minX;gx<=maxX;gx++){
   const cell=this.cells.get(`${gx}:${gy}`);if(!cell)continue;
   const dx=Math.max(cell.x-x,0,x-cell.x-cell.size),dy=Math.max(cell.y-y,0,y-cell.y-cell.size);
   if(dx*dx+dy*dy<=radius*radius)return true;
  }
  return false;
 }
 latchBucketContacts(){
  for(const e of this.world.enemies){
   if(!e.alive||e.dead||e.bucketBurn)continue;const b=e.body.bounds;
   const minX=Math.max(0,Math.floor(b.min.x/this.size)),maxX=Math.min(Math.ceil(this.world.width/this.size)-1,Math.floor((b.max.x-1e-9)/this.size)),
    minY=Math.max(0,Math.floor(b.min.y/this.size)),maxY=Math.min(Math.ceil(this.world.height/this.size)-1,Math.floor((b.max.y-1e-9)/this.size));
   for(let gy=minY;gy<=maxY&&!e.bucketBurn;gy++)for(let gx=minX;gx<=maxX;gx++){
    const c=this.cells.get(`${gx}:${gy}`);if(!c?.potent)continue;
    burnBucketEnemy(this.world,e,[...c.sourceIds].find(id=>this.bucketSources.has(id)));break;
   }
  }
 }
 advance(){
  // Touch detection follows every physics step, independently of the slower
  // fluid propagation and ordinary map-lava damage cadence.
  this.latchBucketContacts();
  const w=this.world;if(w.time<this.nextAt)return;this.nextAt=w.time+.12;
  const desired=new Map(),queue=[],key=(x,y)=>`${x}:${y}`,clearCache=new Map();
  const clear=(gx,gy)=>{const k=key(gx,gy);if(!clearCache.has(k))clearCache.set(k,this.clear(gx,gy));return clearCache.get(k);};
  const add=(gx,gy,sourceId,potent,spread,parent)=>{
   const k=key(gx,gy);let cell=desired.get(k);
   if(!cell){if(desired.size>=4096||!clear(gx,gy))return;cell={gx,gy,x:gx*this.size,y:gy*this.size,size:this.size,sourceId,sourceIds:new Set(),potent:false,spread,parent,roots:new Set(),parents:new Map(),routes:new Map()};desired.set(k,cell);}
   if(parent===null)cell.roots.add(sourceId);else{if(!cell.parents.has(sourceId))cell.parents.set(sourceId,new Set());cell.parents.get(sourceId).add(parent);}
   if(cell.routes.has(sourceId)&&cell.routes.get(sourceId)<=spread)return;
   cell.routes.set(sourceId,spread);cell.sourceIds.add(sourceId);cell.potent||=potent;
   queue.push({gx,gy,sourceId,potent,spread});
  };
  for(const s of this.sources)if(s.active){
   if(s.seedCells){for(const p of s.seedCells)add(p.x,p.y,s.id,s.potent,0,null);}
   else for(let dx=0;dx<4;dx++)for(let dy=0;dy<4;dy++)add(s.x+dx,s.y+dy,s.id,s.potent,0,null);
  }
  for(let i=0;i<queue.length;i++){
   const c=queue[i],k=key(c.gx,c.gy);
   if((c.gy+2)*4>w.grid.height)continue; // Open void drains; it is not a floor.
   if(clear(c.gx,c.gy+1))add(c.gx,c.gy+1,c.sourceId,c.potent,0,k);
   else if(c.spread<4){add(c.gx-1,c.gy,c.sourceId,c.potent,c.spread+1,k);add(c.gx+1,c.gy,c.sourceId,c.potent,c.spread+1,k);}
  }
  const next=new Map();for(const [k,c]of desired){
   // Each source's provenance advances with its own visible front. An existing
   // ordinary pool cannot lend its occupied cells to future bucket flow.
   c.sourceIds=new Set([...c.sourceIds].filter(id=>c.roots.has(id)||this.cells.get(k)?.sourceIds.has(id)||[...c.parents.get(id)||[]].some(p=>this.cells.get(p)?.sourceIds.has(id))));
   if(!c.sourceIds.size)continue;
   c.sourceId=c.sourceIds.values().next().value;c.potent=[...c.sourceIds].some(id=>this.bucketSources.has(id));next.set(k,c);
  }
  this.settling=next.size!==this.cells.size||[...next].some(([k,c])=>!this.cells.has(k)||c.sourceIds.size!==this.cells.get(k).sourceIds.size||[...c.sourceIds].some(id=>!this.cells.get(k).sourceIds.has(id)));if(this.settling)this.revision++;this.cells=next;
  for(const e of w.enemies){
   if(!e.alive||e.dead)continue;const b=e.body.bounds;
   const touched=[...this.cells.values()].filter(c=>b.max.x>c.x&&b.min.x<c.x+c.size&&b.max.y>c.y&&b.min.y<c.y+c.size),touching=touched.length>0;
   const bucket=touched.find(c=>c.potent);if(bucket){burnBucketEnemy(w,e,[...bucket.sourceIds].find(id=>this.bucketSources.has(id)));continue;}
   if(touching)thawEnemy(w,e);
   if(touching&&!fireImmune(e)&&w.time>=(e.lavaDamageAt||0)){e.lavaDamageAt=w.time+.6;e.burningUntil=Math.max(e.burningUntil,w.time+.65);damageEnemy(w,e,heavyMob(e)?50:40,{kind:'lava'});}
  }
 }
 cool(x,y,radius){
  let count=0;const w=this.world;
  for(const[k,c]of this.cells){if(Math.hypot(c.x+c.size/2-x,c.y+c.size/2-y)>radius)continue;
   w.grid.fill(c.gx*4,c.gy*4,4,4,40);this.cells.delete(k);count++;
   for(const s of this.sources)if(c.gx>=s.x&&c.gx<s.x+4&&c.gy>=s.y&&c.gy<s.y+4)s.active=false;
  }
  if(count){this.nextAt=0;this.revision++;w.stats.lavaCooled+=count;w.synchronize();}return count;
 }
 snapshot(){return {sources:this.sources.filter(s=>s.active).length,cells:this.cells.size,settling:this.settling};}
}
