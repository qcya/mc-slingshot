import { AMMO, MATERIALS, TILE, clamp } from './config.mjs';
import { PixelGrid, meshPixels, components, cropPixels, findSafeExit, impactDamage } from './pixels.mjs';
import {RearLayer} from './rear.mjs';
import {actorState,animateActor} from './behavior.mjs';
import {DEATH_TOPPLE} from './animation.mjs';
import {igniteWood,igniteImpact,advanceFire,burnEnemy} from './fire.mjs';

// Pixels own material state; Matter owns ALL rigid-body motion and contacts.
// No fallback integrator and no permanent invisible plane beneath damaged soil.
export class SiegeWorld {
  constructor(Matter,{grid=new PixelGrid(512,288),pixelSize=3,rear=new RearLayer(grid.width,grid.height)}={}){
    if(!Matter?.Engine)throw new Error('Matter.js 物理引擎未加载，请重新启动游戏。');
    this.M=Matter;this.grid=grid;this.s=pixelSize;this.rear=rear;
    this.width=grid.width*pixelSize;this.height=grid.height*pixelSize;
    this.engine=Matter.Engine.create({enableSleeping:true,positionIterations:8,velocityIterations:8,gravity:{x:0,y:1,scale:.001}});
    this.staticTiles=new Map();this.projectiles=[];this.debris=[];this.enemies=[];
    this.events=[];this.contacts=[];this.cooldowns=new Map();this.fires=[];this.fireSerial=0;
    this.time=0;this.serial=0;this.stats={removed:0,backgroundRemoved:0,explosions:0,portals:0,enemyDamage:0};
    Matter.Events.on(this.engine,'collisionStart',event=>{
      for(const pair of event.pairs){const a=pair.bodyA.parent,b=pair.bodyB.parent,ea=a.plugin.entity,eb=b.plugin.entity;
        const ammo=ea?.type==='ammo'?ea:eb?.type==='ammo'?eb:null,wall=ammo===ea?b:a;
        if(ammo&&['cobble','tnt'].includes(ammo.ammo.id)&&wall.plugin.glass)pair.isSensor=true;
      }this.contacts.push(...event.pairs);
    });
    this.synchronize();
  }
  allMoving(){return [...this.projectiles,...this.debris,...this.enemies].filter(e=>!e.dead);}
  register(entity,body){
    entity.id=++this.serial;entity.body=body;body.plugin.entity=entity;
    this.M.Composite.add(this.engine.world,body);return entity;
  }
  wakeBounds(bounds){for(const e of this.allMoving()){
    const b=e.body.bounds;
    if(b.max.x>=bounds.min.x-4&&b.min.x<=bounds.max.x+4&&b.max.y>=bounds.min.y-4&&b.min.y<=bounds.max.y+4)this.M.Sleeping.set(e.body,false);
  }}
  remove(entity){if(!entity||entity.dead)return;entity.dead=true;this.wakeBounds(entity.body.bounds);this.M.Composite.remove(this.engine.world,entity.body);}
  spawnProjectile(kind,x,y,vx,vy){
    const ammo=AMMO.find(a=>a.id===kind);if(!ammo)throw new Error(`Unknown ammunition: ${kind}`);
    const options={friction:.85,frictionStatic:1.2,frictionAir:.0015,restitution:kind==='cobble'?.14:kind==='tnt'?.01:.07,slop:.025,sleepThreshold:75};
    const body=(kind==='cobble'||kind==='tnt')?this.M.Bodies.rectangle(x,y,ammo.size,ammo.size,options):this.M.Bodies.circle(x,y,ammo.size/2,options,16);
    this.M.Body.setMass(body,ammo.mass);
    this.M.Body.setVelocity(body,{x:vx/60,y:vy/60});
    const p=this.register({type:'ammo',ammo,age:0,fuse:kind==='tnt'?4:Infinity,uses:0},body);
    if(kind==='tnt')this.events.push({type:'fuse',x,y});
    this.projectiles.push(p);return p;
  }
  addEnemy(x,feetY,skin='zombie',options={}){
    const dimensions=skin==='warden'?{width:58,height:132}:{width:32,height:92},feetOffset=dimensions.height/2;
    const body=this.M.Bodies.rectangle(x,feetY-feetOffset,dimensions.width,dimensions.height,{friction:.85,frictionStatic:1,restitution:0,frictionAir:.01,slop:.025,inertia:Infinity,collisionFilter:{category:2,mask:0xfffffffd}});
    this.M.Body.setMass(body,skin==='warden'?3.6:1.2);
    const e=this.register({type:'enemy',skin,hp:skin==='warden'?300:100,dimensions,feetOffset,projectileHits:new Set(),alive:true,deathAt:0,facing:this.enemies.length%2?-1:1,walkDistance:0,turns:0,turnAt:0,lastX:x},body);
    Object.assign(e,actorState(e.id,this.time));e.stationary=!!options.stationary;
    e.burnSources=new Set();e.burnTicks=[];e.burningUntil=0;this.enemies.push(e);return e;
  }
  patrol(dt){
    for(const e of this.enemies){
      if(e.dead||!e.alive)continue;const b=e.body,x=b.position.x,feet=b.bounds.max.y;
      const distance=Math.min(3,Math.abs(x-e.lastX));e.lastX=x;
      const influenced=this.time<e.externalUntil;
      const half=e.dimensions.width/2,ground=this.sample(x-half*.65,feet+3)||this.sample(x+half*.65,feet+3);
      const grounded=!!ground&&Math.abs(b.velocity.y)<.65&&Math.abs(b.velocity.x)<2.2&&!influenced;
      const previous=e.behavior,walking=animateActor(e,this.time,dt,grounded)&&!e.stationary;
      if(previous==='walk'&&e.behavior==='idle'&&e.idleCount%3===1)this.events.push({type:'ambient',sound:`${e.skin}_idle`});
      if(!grounded)continue;
      if(!walking){this.M.Body.setVelocity(b,{x:b.velocity.x*.7,y:b.velocity.y});continue;}e.walkDistance+=distance;
      const ahead=x+e.facing*(half+7),wall=this.sample(ahead,feet-e.dimensions.height*.26)||this.sample(ahead,feet-e.dimensions.height*.71),edge=!this.sample(ahead,feet+5);
      if((wall||edge)&&this.time>e.turnAt){e.facing*=-1;e.turnAt=this.time+.4;e.turns++;}
      if(wall||edge){this.M.Body.setVelocity(b,{x:0,y:b.velocity.y});continue;}
      this.M.Sleeping.set(b,false);this.M.Body.setVelocity(b,{x:e.facing*.36,y:b.velocity.y});
    }
  }
  synchronize(){
    if(!this.grid.dirty.size)return;
    const cols=Math.ceil(this.grid.width/16);
    // Minecraft-like terrain stays fixed, even when completely unsupported.
    // Only the pixels explicitly removed by a weapon are changed.
    for(const id of this.grid.dirty){
      const old=this.staticTiles.get(id);if(old)this.M.Composite.remove(this.engine.world,old);
      this.staticTiles.delete(id);
      const tx=id%cols*16,ty=Math.floor(id/cols)*16,w=Math.min(16,this.grid.width-tx),h=Math.min(16,this.grid.height-ty);
      this.wakeBounds({min:{x:tx*this.s,y:ty*this.s},max:{x:(tx+w)*this.s,y:(ty+h)*this.s}});
      const mask=new Uint8Array(w*h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++)mask[y*w+x]=this.grid.get(tx+x,ty+y);
      const rects=meshPixels(mask,w,h);if(!rects.length)continue;
      const parts=rects.map(r=>this.M.Bodies.rectangle((tx+r.x+r.w/2)*this.s,(ty+r.y+r.h/2)*this.s,r.w*this.s,r.h*this.s,{isStatic:true,friction:.8,frictionStatic:1.2,restitution:0,slop:.025}));
      const body=parts.length===1?parts[0]:this.M.Body.create({parts,isStatic:true,friction:.8,frictionStatic:1.2,slop:.025});
      body.plugin.terrain=true;body.plugin.tileId=id;body.plugin.glass=mask.every(m=>!m||m===6);
      this.staticTiles.set(id,body);this.M.Composite.add(this.engine.world,body);
    }
    this.grid.dirty.clear();
  }
  addDebris(mask,w,h,origin,texture={x:0,y:0},angle=0,velocity={x:0,y:0},omega=0){
    const rects=meshPixels(mask,w,h);if(!rects.length)return null;
    const parts=rects.map(r=>this.M.Bodies.rectangle(origin.x+(r.x+r.w/2)*this.s,origin.y+(r.y+r.h/2)*this.s,r.w*this.s,r.h*this.s,
      {density:MATERIALS[r.m].density*.001,friction:.8,frictionStatic:1.1,restitution:.04,slop:.02}));
    const body=parts.length===1?parts[0]:this.M.Body.create({parts,friction:.8,frictionStatic:1.1,restitution:.04,slop:.02,sleepThreshold:80});
    const offset={x:origin.x-body.position.x,y:origin.y-body.position.y};
    if(angle)this.M.Body.rotate(body,angle,origin);
    this.M.Body.setVelocity(body,velocity);this.M.Body.setAngularVelocity(body,omega);
    const hp=Float32Array.from(mask,m=>m?MATERIALS[m].hard:0);
    const entity=this.register({type:'debris',mask,w,h,hp,offset,texture,revision:0,backPixels:[],backRevision:0,count:mask.reduce((n,m)=>n+!!m,0)},body);
    this.debris.push(entity);return entity;
  }
  localPoint(e,x,y){const dx=x-e.body.position.x,dy=y-e.body.position.y,c=Math.cos(e.body.angle),s=Math.sin(e.body.angle);return {x:(dx*c+dy*s-e.offset.x)/this.s,y:(-dx*s+dy*c-e.offset.y)/this.s};}
  worldPoint(e,x,y){const lx=e.offset.x+x*this.s,ly=e.offset.y+y*this.s,c=Math.cos(e.body.angle),s=Math.sin(e.body.angle);return {x:e.body.position.x+lx*c-ly*s,y:e.body.position.y+lx*s+ly*c};}
  sample(x,y){
    const m=this.grid.get(x/this.s,y/this.s);if(m)return m;
    for(const e of this.debris){if(e.dead)continue;const b=e.body.bounds;if(x<b.min.x||x>b.max.x||y<b.min.y||y>b.max.y)continue;
      const p=this.localPoint(e,x,y),gx=Math.floor(p.x),gy=Math.floor(p.y);if(gx>=0&&gy>=0&&gx<e.w&&gy<e.h&&e.mask[gy*e.w+gx])return e.mask[gy*e.w+gx];}
    return 0;
  }
  emitPixel(x,y,m,force=1){this.events.push({type:'pixel',x,y,m,force});}
  clearRearPixel(x,y){
    if(!this.rear.grid.get(x,y))return;
    this.rear.grid.set(x,y,0);this.stats.backgroundRemoved++;
  }
  removeTerrainPixel(x,y){
    this.grid.set(x,y,0);this.clearRearPixel(x,y);
  }
  flushGridPixels(){
    for(const p of this.grid.recent){
      this.clearRearPixel(p.x,p.y);
      if((p.x*7+p.y*11+this.stats.removed)%5===0)this.emitPixel((p.x+.5)*this.s,(p.y+.5)*this.s,p.m);
    }
    this.grid.recent.length=0;
  }
  damageDisk(x,y,radius,power,options={}){
    let n=this.grid.damageDisk(x/this.s,y/this.s,radius/this.s,power,options);
    this.flushGridPixels();
    for(const e of [...this.debris])if(!e.dead){
      const remaining=(options.budget??Infinity)-n;if(remaining<=0)break;
      n+=this.damageDebris(e,x,y,radius,power,{...options,budget:remaining});
    }
    this.stats.removed+=n;return n;
  }
  damageDebris(e,x,y,radius,power,{budget=Infinity,onlyMaterial=0}={}){
    const center=this.localPoint(e,x,y),r=radius/this.s;let n=0;
    for(let gy=Math.max(0,Math.floor(center.y-r));gy<Math.min(e.h,Math.ceil(center.y+r));gy++)for(let gx=Math.max(0,Math.floor(center.x-r));gx<Math.min(e.w,Math.ceil(center.x+r));gx++){
      const k=gy*e.w+gx,m=e.mask[k];if(!m||m===7||(onlyMaterial&&m!==onlyMaterial))continue;
      const d=Math.hypot(gx+.5-center.x,gy+.5-center.y);if(d>r)continue;
      e.hp[k]-=power*(.45+.55*(1-d/r));if(e.hp[k]>0||n>=budget)continue;
      const point=this.worldPoint(e,gx+.5,gy+.5);e.mask[k]=0;n++;
      if(k%5===0)this.emitPixel(point.x,point.y,m);
    }
    if(n){e.count-=n;this.splitDebris(e);}return n;
  }
  splitDebris(e){
    const pose={x:e.body.position.x,y:e.body.position.y},velocity={...e.body.velocity},omega=e.body.angularVelocity,angle=e.body.angle;
    this.remove(e);
    const children=[];
    for(const indices of components(e.mask,e.w,e.h)){
      const piece=cropPixels(e.mask,e.w,indices),origin=this.worldPoint(e,piece.x,piece.y);
      if(indices.length<6){for(const k of indices){const p=this.worldPoint(e,k%e.w,Math.floor(k/e.w));this.emitPixel(p.x,p.y,e.mask[k]);}continue;}
      const child=this.addDebris(piece.mask,piece.w,piece.h,origin,{x:e.texture.x+piece.x,y:e.texture.y+piece.y},angle,velocity,omega);
      children.push({child,piece});
      // Preserve local impact damage, not just transparent holes.
      for(let y=0;y<piece.h;y++)for(let x=0;x<piece.w;x++)child.hp[y*piece.w+x]=e.hp[(y+piece.y)*e.w+x+piece.x];
      const dx=child.body.position.x-pose.x,dy=child.body.position.y-pose.y;
      this.M.Body.setVelocity(child.body,{x:velocity.x-omega*dy,y:velocity.y+omega*dx});
    }
    for(const p of e.backPixels){
      let best=null,distance=Infinity;
      for(const c of children){const {piece}=c,x=p.anchorX-piece.x,y=p.anchorY-piece.y;
        const hit=x>=0&&y>=0&&x<piece.w&&y<piece.h&&piece.mask[y*piece.w+x];
        const d=hit?-1:Math.hypot(x-piece.w/2,y-piece.h/2);if(d<distance){distance=d;best=c;}
      }
      if(best){const {child,piece}=best;child.backPixels.push({...p,x:p.x-piece.x,y:p.y-piece.y,anchorX:p.anchorX-piece.x,anchorY:p.anchorY-piece.y});}
    }
  }
  hurt(e,damage){
    if(!e.alive||!Number.isFinite(damage)||damage<3)return;e.hp-=damage;if(Math.abs(e.hp)<1e-8)e.hp=0;e.hurtUntil=this.time+.3;this.stats.enemyDamage+=damage;
    this.events.push({type:'hurt',x:e.body.position.x,y:e.body.position.y,sound:`${e.skin}_hurt`});
    if(e.hp<=0){e.alive=false;e.deathAt=this.time;this.M.Body.setAngularVelocity(e.body,0);}
  }
  blast(x,y,radius=98,power=160){
    this.stats.explosions++;this.events.push({type:'explosion',x,y,radius});
    const damage={jagged:true,seed:this.stats.explosions};
    this.damageDisk(x,y,radius,power,damage);
    // Rear walls have no bodies, but TNT can destroy their exposed pixels too.
    this.stats.backgroundRemoved+=this.rear.grid.damageDisk(x/this.s,y/this.s,radius/this.s,power,{...damage,canDamage:(gx,gy)=>!this.grid.get(gx,gy)});
    this.rear.grid.recent.length=0;this.synchronize();
    for(const e of this.allMoving()){
      const dx=e.body.position.x-x,dy=e.body.position.y-y,d=Math.hypot(dx,dy),reach=radius+50;if(d>reach)continue;
      const speed=clamp(1600*(1-d/reach)/e.body.mass,0,650),ux=d>1?dx/d:(e.id%2?1:-1),uy=d>1?dy/d:0;
      this.M.Sleeping.set(e.body,false);
      this.M.Body.setVelocity(e.body,{x:e.body.velocity.x+ux*speed/60,y:e.body.velocity.y+(uy-.5)*speed/60});
      e.externalUntil=this.time+.8;
      if(e.type==='enemy')this.hurt(e,e.skin==='warden'?150:Math.max(0,180*(1-d/reach)));
    }
  }
  processContact(pair){
    const a=pair.bodyA.parent,b=pair.bodyB.parent;if(a===b)return;
    const key=a.id<b.id?`${a.id}:${b.id}`:`${b.id}:${a.id}`;
    if(this.time-(this.cooldowns.get(key)??-100)<.14)return;this.cooldowns.set(key,this.time);
    const ea=a.plugin.entity,eb=b.plugin.entity;if(ea?.dead||eb?.dead)return;
    const va=this.before.get(a.id)||a.velocity,vb=this.before.get(b.id)||b.velocity,n=pair.collision.normal;
    const supports=pair.collision.supports.filter(Boolean);
    const point=supports.length?{x:supports.reduce((t,p)=>t+p.x,0)/supports.length,y:supports.reduce((t,p)=>t+p.y,0)/supports.length}:{x:(a.position.x+b.position.x)/2,y:(a.position.y+b.position.y)/2};
    const omegaA=va.omega??a.angularVelocity,omegaB=vb.omega??b.angularVelocity;
    const avx=va.x-omegaA*(point.y-a.position.y),avy=va.y+omegaA*(point.x-a.position.x);
    const bvx=vb.x-omegaB*(point.y-b.position.y),bvy=vb.y+omegaB*(point.x-b.position.x);
    const speed=Math.abs((avx-bvx)*n.x+(avy-bvy)*n.y)*60;
    // TNT has no direct damage. Ender pearls hurt creatures, never materials.
    const contactDamage=(target,entity,mass,targetMass)=>{
      // The Warden's armored body ignores incidental debris and landing damage;
      // blast knockback must not turn one TNT explosion into two damage sources.
      if(entity?.type!=='ammo')return target.skin==='warden'?0:impactDamage(speed,mass,targetMass);
      if(['tnt','fire'].includes(entity.ammo.id))return 0;
      if(entity.ammo.id==='ender'){
        // Use the pearl's velocity BEFORE collision resolution, not relative
        // speed: a walking mob must not turn a resting pearl into a trap.
        const velocity=this.before.get(entity.body.id)||entity.body.velocity;
        if(Math.hypot(velocity.x,velocity.y)*60<30)return 0;
      }
      if(target.skin==='warden'){
        if(target.projectileHits.has(entity.id))return 0;target.projectileHits.add(entity.id);
        return entity.ammo.id==='cobble'?100:75;
      }
      return 250;
    };
    if(ea?.type==='enemy')this.hurt(ea,contactDamage(ea,eb,b.mass,a.mass));
    if(eb?.type==='enemy')this.hurt(eb,contactDamage(eb,ea,a.mass,b.mass));
    const ammo=ea?.type==='ammo'?ea:eb?.type==='ammo'?eb:null;
    const other=ammo===ea?eb:ea,otherBody=ammo===ea?b:a;
    if(ammo){
      const kind=ammo.ammo.id;
      if(kind==='fire'){
        const sourceId=`ammo:${ammo.id}`;
        if(other?.type==='enemy')burnEnemy(this,other,sourceId);
        else{
          const sign=(ammo.body.position.x-point.x)*n.x+(ammo.body.position.y-point.y)*n.y>=0?1:-1;
          igniteImpact(this,point.x,point.y,{x:n.x*sign,y:n.y*sign},sourceId);
        }
        this.remove(ammo);return;
      }
      if(['cobble','tnt'].includes(kind)&&otherBody.plugin.glass){this.shatterGlass(otherBody,point,speed);return;}
      if(kind==='tnt')return;
      if(kind==='ender'&&ammo.uses===0&&(otherBody.plugin.terrain||other?.type==='debris')){
        const velocity=this.before.get(ammo.body.id)||ammo.body.velocity;
        const exit=findSafeExit((x,y)=>!!this.sample(x,y),ammo.body.position,velocity,ammo.ammo.size/2,TILE*2,this.s/2,n);
        if(exit){
          const old={...ammo.body.position};this.M.Body.setPosition(ammo.body,exit);this.M.Body.setVelocity(ammo.body,{x:velocity.x*.95,y:velocity.y*.95});
          this.M.Sleeping.set(ammo.body,false);ammo.uses++;this.stats.portals++;this.events.push({type:'portal',x:old.x,y:old.y,to:exit});return;
        }
      }
      if(kind==='ender')return;
    }
    const striker=ammo||((ea?.type==='debris'&&b.plugin.terrain)?ea:(eb?.type==='debris'&&a.plugin.terrain)?eb:null);
    if(striker&&speed>180){
      const power=clamp(speed*Math.sqrt(Math.min(15,striker.body.mass))*.13,15,240),radius=clamp(10+speed*.018,15,31);
      const material=this.sample(point.x,point.y)||this.sample(point.x,point.y+this.s)||3;
      this.damageDisk(point.x,point.y,radius,power);
      this.events.push({type:'impact',x:point.x,y:point.y,m:material,speed,sound:striker.type==='ammo'&&striker.ammo.id==='cobble'?'stone':MATERIALS[material]?.sound});
    }
  }
  ignite(x,y,reach,sourceId){return igniteWood(this,x,y,reach,sourceId);}
  shatterGlass(body,point,speed){
    const id=body.plugin.tileId,cols=Math.ceil(this.grid.width/16),tx=id%cols*16,ty=Math.floor(id/cols)*16;let count=0;
    for(let y=ty;y<ty+16;y++)for(let x=tx;x<tx+16;x++)if(this.grid.get(x,y)===6){this.removeTerrainPixel(x,y);if(count%5===0)this.emitPixel((x+.5)*this.s,(y+.5)*this.s,6);count++;}
    this.stats.removed+=count;if(count)this.events.push({type:'impact',x:point.x,y:point.y,sound:'glass',speed:Math.max(300,speed)});
  }
  step(dt){
    this.time+=dt;advanceFire(this);this.synchronize();this.patrol(dt);
    this.before=new Map();
    for(const e of this.allMoving()){
      const b=e.body,speed=Math.hypot(b.velocity.x,b.velocity.y);
      if(speed>26)this.M.Body.setVelocity(b,{x:b.velocity.x/speed*26,y:b.velocity.y/speed*26});
      if(Math.abs(b.angularVelocity)>.28)this.M.Body.setAngularVelocity(b,Math.sign(b.angularVelocity)*.28);
      this.before.set(b.id,{...b.velocity,omega:b.angularVelocity});
    }
    this.contacts.length=0;this.M.Engine.update(this.engine,dt*1000);
    for(const pair of this.contacts)this.processContact(pair);
    for(const p of this.projectiles){
      if(p.dead)continue;p.age+=dt;p.fuse-=dt;
      if(p.ammo.id==='tnt'&&p.fuse<=0){const pos={...p.body.position};this.remove(p);this.blast(pos.x,pos.y);}
    }
    for(const e of this.allMoving()){
      const {x,y}=e.body.position;
      if(e.type==='enemy'){
        const bounds=e.body.bounds;
        if(bounds.max.x<0||bounds.min.x>this.width||bounds.max.y<0||bounds.min.y>this.height){
          if(e.alive)this.hurt(e,Math.max(3,e.hp+1));this.remove(e);continue;
        }
      }
      if(y>this.height+200||x< -250||x>this.width+250){if(e.type==='enemy'&&e.alive)this.hurt(e,Math.max(3,e.hp+1));this.remove(e);}
      if(e.type==='enemy'&&!e.alive&&this.time-e.deathAt>=DEATH_TOPPLE){
        this.events.push({type:'death',x,y:y+22});this.remove(e);
      }
      if(e.type==='ammo'&&e.age>18&&e.ammo.id!=='cobble')this.remove(e);
    }
    this.projectiles=this.projectiles.filter(e=>!e.dead);this.debris=this.debris.filter(e=>!e.dead);
    this.synchronize();
    if(this.cooldowns.size>1000)for(const [key,t] of this.cooldowns)if(this.time-t>1)this.cooldowns.delete(key);
  }
  active(){return this.fires.length>0||this.enemies.some(e=>e.alive&&e.burnTicks.length>0)||this.projectiles.some(p=>!p.dead&&(p.fuse<Infinity||(!p.body.isSleeping&&Math.hypot(p.body.velocity.x,p.body.velocity.y)>.15)))||this.debris.some(e=>!e.body.isSleeping&&e.body.speed>.25);}
  snapshot(){return {time:this.time,removed:this.stats.removed,backgroundRemoved:this.stats.backgroundRemoved,explosions:this.stats.explosions,portals:this.stats.portals,
    physics:'Matter.js',bodies:this.M.Composite.allBodies(this.engine.world).length,
    debris:this.debris.length,enemiesAlive:this.enemies.filter(e=>e.alive).length,
    projectiles:this.projectiles.map(p=>({id:p.ammo.id,x:p.body.position.x,y:p.body.position.y,angle:p.body.angle,speed:p.body.speed*60,sleeping:p.body.isSleeping,uses:p.uses})),
    particlesPending:this.events.length};}
}
