import {heavyMob,fireImmune,damageEnemy} from './combat.mjs';
// Bounded fluid cells follow foreground pixels. Stable lava permits round loss.
export class LavaField{
 constructor(world,sources=[]){this.world=world;this.size=world.s*4;this.cells=new Map();this.sources=sources.map((p,i)=>({x:Math.floor(p.x)*4,y:Math.floor(p.y)*4,id:i,active:true}));this.nextAt=0;this.settling=false;this.revision=0;}
 clear(gx,gy){const w=this.world;if(gx<0||gy<0||(gx+1)*4>w.grid.width||(gy+1)*4>w.grid.height)return false;for(let y=gy*4;y<gy*4+4;y++)for(let x=gx*4;x<gx*4+4;x++)if(w.grid.get(x,y))return false;return true;}
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
 advance(){
  const w=this.world;if(w.time<this.nextAt)return;this.nextAt=w.time+.12;
  const desired=new Map(),queue=[],key=(x,y)=>`${x}:${y}`;
  const add=(gx,gy,sourceId,spread,parent)=>{const k=key(gx,gy);if(desired.has(k)||desired.size>=4096||!this.clear(gx,gy))return;const c={gx,gy,x:gx*this.size,y:gy*this.size,size:this.size,sourceId,spread,parent};desired.set(k,c);queue.push(c);};
  for(const s of this.sources)if(s.active)for(let dx=0;dx<4;dx++)for(let dy=0;dy<4;dy++)add(s.x+dx,s.y+dy,s.id,0,null);
  for(let i=0;i<queue.length&&i<4096;i++){
   const c=queue[i],k=key(c.gx,c.gy);
   if(this.clear(c.gx,c.gy+1))add(c.gx,c.gy+1,c.sourceId,0,k);
   else if(c.spread<4){add(c.gx-1,c.gy,c.sourceId,c.spread+1,k);add(c.gx+1,c.gy,c.sourceId,c.spread+1,k);}
  }
  const next=new Map();for(const [k,c]of desired)if(this.cells.has(k)||c.parent===null||this.cells.has(c.parent))next.set(k,c);
  this.settling=next.size!==this.cells.size||[...next.keys()].some(k=>!this.cells.has(k));if(this.settling)this.revision++;this.cells=next;
  for(const e of w.enemies){
   if(!e.alive||e.dead||fireImmune(e))continue;const b=e.body.bounds;
   const touching=[...this.cells.values()].some(c=>b.max.x>c.x&&b.min.x<c.x+c.size&&b.max.y>c.y&&b.min.y<c.y+c.size);
   if(touching&&w.time>=(e.lavaDamageAt||0)){e.lavaDamageAt=w.time+.6;e.burningUntil=Math.max(e.burningUntil,w.time+.65);damageEnemy(w,e,heavyMob(e)?50:40,{kind:'lava'});}
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
