import { PROJECTILES, MATERIALS, TILE, clamp,isIndestructible } from './config.mjs';
import { PixelGrid, meshPixels, components, cropPixels, findSafeExit, impactDamage } from './pixels.mjs';
import {RearLayer} from './rear.mjs';
import {actorState,animateActor} from './behavior.mjs';
import {DEATH_TOPPLE} from './animation.mjs';
import {igniteWood,igniteImpact,advanceFire,burnEnemy,splashWater} from './fire.mjs';
import {profileFor,heavyMob,armoredMob,projectileBody,projectileGravity,initCombat,advanceCombat,damageEnemy,projectileDamage,projectileOpacity,gust,freezeEnemy,thawEnemy} from './combat.mjs';
import {LavaField} from './lava.mjs';
import {launchVelocity,speedLimit,advanceWeapon,recallTrident,crystalSupported,restAnvilOnEnemy} from './weapons.mjs';
import {tickEncounter,setupEncounter} from './encounters.mjs';

// Pixels own material state; Matter owns ALL rigid-body motion and contacts.
// No fallback integrator and no permanent invisible plane beneath damaged soil.
export class SiegeWorld {
  constructor(Matter,{grid=new PixelGrid(512,288),pixelSize=3,rear=new RearLayer(grid.width,grid.height),lavaSources=[]}={}){
    if(!Matter?.Engine)throw new Error('Matter.js 物理引擎未加载，请重新启动游戏。');
    this.M=Matter;this.grid=grid;this.s=pixelSize;this.rear=rear;
    this.width=grid.width*pixelSize;this.height=grid.height*pixelSize;
    this.engine=Matter.Engine.create({enableSleeping:true,positionIterations:8,velocityIterations:8,gravity:{x:0,y:1,scale:.001}});
    this.staticTiles=new Map();this.projectiles=[];this.debris=[];this.enemies=[];
    this.events=[];this.contacts=[];this.cooldowns=new Map();this.fires=[];this.fireSerial=0;
    this.time=0;this.serial=0;this.stats={removed:0,backgroundRemoved:0,explosions:0,portals:0,enemyDamage:0,lavaCooled:0};
    this.lava=new LavaField(this,lavaSources);
    Matter.Events.on(this.engine,'collisionStart',event=>{
      for(const pair of event.pairs){const a=pair.bodyA.parent,b=pair.bodyB.parent,ea=a.plugin.entity,eb=b.plugin.entity;
        const ammo=ea?.type==='ammo'?ea:eb?.type==='ammo'?eb:null,wall=ammo===ea?b:a;
        const wallPart=ammo===ea?pair.bodyB:pair.bodyA;
        if(ammo&&['cobble','tnt','trident'].includes(ammo.ammo.id)&&(wall.plugin.glass||wallPart.plugin.material===6)){pair.isSensor=true;pair.glassContact=true;}
        if(ammo?.ammo.id==='trident'&&wall.plugin.entity?.type==='enemy')pair.isSensor=true;
        if(ammo?.ammo.id==='anvil'&&wall.plugin.entity?.type==='enemy')pair.isSensor=true;
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
  spawnProjectile(kind,x,y,vx,vy,options={}){
    const ammo=PROJECTILES.find(a=>a.id===kind);if(!ammo)throw new Error(`Unknown ammunition: ${kind}`);
    const physicsOptions={friction:kind==='slimeball'?.04:.85,frictionStatic:1.2,frictionAir:.0015,restitution:ammo.restitution??(kind==='cobble'?.14:kind==='tnt'?.01:kind==='trident'?0:.07),slop:.025,sleepThreshold:75};
    const body=projectileBody(this.M,ammo,x,y,{...physicsOptions,...(['crystal','trident'].includes(kind)?{inertia:Infinity}:{})});
    this.M.Body.setMass(body,ammo.mass);
    this.M.Body.setVelocity(body,launchVelocity(ammo,vx,vy));
    const p=this.register({type:'ammo',ammo,age:0,fuse:kind==='tnt'?4:Infinity,uses:0,expiresAt:kind==='ender'?this.time+5:Infinity,ignited:false},body);
    if(kind==='trident')p.returnHome={...(options.returnHome||{x,y})};
    if(kind==='tnt')this.events.push({type:'fuse',x,y});
    this.projectiles.push(p);return p;
  }
  addEnemy(x,feetY,skin='zombie',options={}){
    const profile=profileFor(skin),dimensions={width:profile.width,height:profile.height},feetOffset=dimensions.height/2;
    const body=this.M.Bodies.rectangle(x,feetY-feetOffset,dimensions.width,dimensions.height,{friction:.85,frictionStatic:1,restitution:0,frictionAir:.01,slop:.025,inertia:Infinity,collisionFilter:{category:2,mask:0xfffffffd}});
    this.M.Body.setMass(body,profile.mass);
    const e=this.register({type:'enemy',skin,hp:profile.hp,dimensions,feetOffset,projectileHits:new Set(),alive:true,deathAt:0,facing:this.enemies.length%2?-1:1,walkDistance:0,turns:0,turnAt:0,lastX:x},body);
    Object.assign(e,actorState(e.id,this.time));e.stationary=!!options.stationary;
    initCombat(e,this.time,options);e.burnSources=new Set();e.burnTicks=[];e.burningUntil=0;this.enemies.push(e);setupEncounter(this,e);return e;
  }
  patrol(dt){
    for(const e of this.enemies){
      if(e.dead||!e.alive)continue;const b=e.body,x=b.position.x,feet=b.bounds.max.y;
      if(e.frozen)continue;
      const distance=Math.min(3,Math.abs(x-e.lastX));e.lastX=x;
      const influenced=this.time<e.externalUntil;
      const half=e.dimensions.width/2,ground=this.sample(x-half*.65,feet+3)||this.sample(x+half*.65,feet+3);
      const grounded=!!ground&&Math.abs(b.velocity.y)<.65&&Math.abs(b.velocity.x)<2.2&&!influenced;
      const previous=e.behavior,walking=animateActor(e,this.time,dt,grounded)&&!e.stationary;
      if(tickEncounter(this,e,dt))continue;
      advanceCombat(this,e,dt);
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
      const parts=rects.map(r=>{const part=this.M.Bodies.rectangle((tx+r.x+r.w/2)*this.s,(ty+r.y+r.h/2)*this.s,r.w*this.s,r.h*this.s,{isStatic:true,friction:.8,frictionStatic:1.2,restitution:0,slop:.025});part.plugin.material=r.m;return part;});
      const body=parts.length===1?parts[0]:this.M.Body.create({parts,isStatic:true,friction:.8,frictionStatic:1.2,slop:.025});
      body.plugin.terrain=true;body.plugin.tileId=id;body.plugin.glass=mask.every(m=>!m||m===6);
      this.staticTiles.set(id,body);this.M.Composite.add(this.engine.world,body);
    }
    this.grid.dirty.clear();
  }
  addDebris(mask,w,h,origin,texture={x:0,y:0},angle=0,velocity={x:0,y:0},omega=0){
    const rects=meshPixels(mask,w,h);if(!rects.length)return null;
    const parts=rects.map(r=>{const part=this.M.Bodies.rectangle(origin.x+(r.x+r.w/2)*this.s,origin.y+(r.y+r.h/2)*this.s,r.w*this.s,r.h*this.s,
      {density:MATERIALS[r.m].density*.001,friction:.8,frictionStatic:1.1,restitution:.04,slop:.02});part.plugin.material=r.m;return part;});
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
    const material=this.rear.grid.get(x,y);if(!material||isIndestructible(material))return;
    this.rear.grid.set(x,y,0);this.stats.backgroundRemoved++;
  }
  removeTerrainPixel(x,y){
    if(isIndestructible(this.grid.get(x,y)))return;
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
      const k=gy*e.w+gx,m=e.mask[k];if(!m||isIndestructible(m)||(onlyMaterial&&m!==onlyMaterial))continue;
      const d=Math.hypot(gx+.5-center.x,gy+.5-center.y);if(d>r)continue;
      e.hp[k]-=power*(.45+.55*(1-d/r));if(e.hp[k]>0||n>=budget)continue;
      const point=this.worldPoint(e,gx+.5,gy+.5);e.mask[k]=0;n++;
      if(k%5===0)this.emitPixel(point.x,point.y,m);
    }
    if(n){e.count-=n;this.splitDebris(e);}return n;
  }
  drillDebrisStrip(left,top,right,bottom,probe=false){
    let total=0;
    for(const e of [...this.debris]){
      if(e.dead)continue;const b=e.body.bounds;
      if(b.max.x<=left||b.min.x>=right||b.max.y<=top||b.min.y>=bottom)continue;
      const corners=[[left,top],[right,top],[left,bottom],[right,bottom]].map(([x,y])=>this.localPoint(e,x,y));
      const x0=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.x)))),x1=Math.min(e.w,Math.ceil(Math.max(...corners.map(p=>p.x))));
      const y0=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.y)))),y1=Math.min(e.h,Math.ceil(Math.max(...corners.map(p=>p.y))));
      let removed=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const k=y*e.w+x,material=e.mask[k];if(!material||!probe&&isIndestructible(material))continue;
        const point=this.worldPoint(e,x+.5,y+.5);
        if(point.x<left||point.x>=right||point.y<top||point.y>=bottom)continue;
        if(probe)return 1;
        e.mask[k]=0;removed++;
        if(removed%24===0)this.emitPixel(point.x,point.y,material);
      }
      if(removed){e.count-=removed;total+=removed;this.splitDebris(e);}
    }
    return total;
  }
  splitDebris(e){
    const pose={x:e.body.position.x,y:e.body.position.y},velocity={...e.body.velocity},omega=e.body.angularVelocity,angle=e.body.angle;
    this.remove(e);
    const children=[];
    for(const indices of components(e.mask,e.w,e.h)){
      const piece=cropPixels(e.mask,e.w,indices),origin=this.worldPoint(e,piece.x,piece.y);
      if(indices.length<6&&!indices.some(k=>isIndestructible(e.mask[k]))){for(const k of indices){const p=this.worldPoint(e,k%e.w,Math.floor(k/e.w));this.emitPixel(p.x,p.y,e.mask[k]);}continue;}
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
    if(!e.alive||!Number.isFinite(damage)||damage<3)return;thawEnemy(this,e);e.hp-=damage;if(Math.abs(e.hp)<1e-8)e.hp=0;e.hurtUntil=this.time+.3;this.stats.enemyDamage+=damage;
    this.events.push({type:'hurt',x:e.body.position.x,y:e.body.position.y,sound:`${e.skin}_${e.hp<=0?'death':'hurt'}`});
    if(e.hp<=0){e.alive=false;e.deathAt=this.time;this.M.Body.setAngularVelocity(e.body,0);}
  }
  detonateCrystals(seeds){
    const group=new Set(seeds.filter(c=>!c.dead)),queue=[...group];
    for(let i=0;i<queue.length;i++)for(const c of this.projectiles){
      if(c.dead||c.ammo.id!=='crystal'||group.has(c))continue;
      if(Math.hypot(c.body.position.x-queue[i].body.position.x,c.body.position.y-queue[i].body.position.y)<=148){group.add(c);queue.push(c);}
    }
    // Snapshot and remove the entire group before any explosion impulse.
    const centers=queue.map(c=>({...c.body.position}));for(const c of queue)this.remove(c);
    for(const p of centers)this.blast(p.x,p.y);
  }
  blast(x,y,radius=98,power=160){
    this.detonateCrystals(this.projectiles.filter(c=>!c.dead&&c.ammo.id==='crystal'&&Math.hypot(c.body.position.x-x,c.body.position.y-y)<=radius+50));
    this.stats.explosions++;this.events.push({type:'explosion',x,y,radius});
    const damage={jagged:true,seed:this.stats.explosions};
    this.damageDisk(x,y,radius,power,damage);
    // Rear walls have no bodies, but TNT can destroy their exposed pixels too.
    this.stats.backgroundRemoved+=this.rear.grid.damageDisk(x/this.s,y/this.s,radius/this.s,power,{...damage,canDamage:(gx,gy)=>!this.grid.get(gx,gy)});
    this.rear.grid.recent.length=0;this.synchronize();
    for(const e of this.allMoving()){
      const dx=e.body.position.x-x,dy=e.body.position.y-y,d=Math.hypot(dx,dy),reach=radius+50;if(d>reach)continue;
      const blastDamage=heavyMob(e)||e.skin==='shulker'?150:Math.max(0,180*(1-d/reach));
      if(e.type==='enemy'&&blastDamage>=3)thawEnemy(this,e);
      const speed=clamp(1600*(1-d/reach)/e.body.mass,0,650),ux=d>1?dx/d:(e.id%2?1:-1),uy=d>1?dy/d:0;
      this.M.Sleeping.set(e.body,false);
      this.M.Body.setVelocity(e.body,{x:e.body.velocity.x+ux*speed/60,y:e.body.velocity.y+(uy-.5)*speed/60});
      e.externalUntil=this.time+.8;
      if(e.type==='enemy')damageEnemy(this,e,blastDamage,{source:`blast:${this.stats.explosions}`,kind:'tnt'});
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
    const crystal=ea?.ammo?.id==='crystal'?ea:eb?.ammo?.id==='crystal'?eb:null;
    if(crystal){
      const striker=crystal===ea?eb:ea,solid=crystal===ea?b:a;
      if(striker?.type==='debris'||striker?.type==='ammo'&&striker.ammo.id!=='crystal'){
        const v=this.before.get(striker.body.id)||striker.body.velocity;
        if(Math.hypot(v.x,v.y)*60>=180){
          this.detonateCrystals([crystal]);
          if(striker.ammo?.id==='wind'){this.remove(striker);gust(this,point.x,point.y);}
          return;
        }
      }
      if(!crystal.placed&&(solid.plugin.terrain||striker?.planted)&&Math.abs(n.y)>.7&&point.y>crystal.body.position.y+crystal.ammo.size*.25&&crystalSupported(this,crystal)){
        crystal.placed=true;this.M.Body.setVelocity(crystal.body,{x:0,y:0});this.M.Body.setAngularVelocity(crystal.body,0);this.M.Body.setStatic(crystal.body,true);
      }
      return;
    }
    // TNT has no direct damage. Ender pearls hurt creatures, never materials.
    const contactDamage=(target,entity,mass,targetMass)=>{
      if(entity?.type==='ammo'){
        const targetX=target.body.position.x,targetY=target.body.position.y;
        const hit=projectileDamage(this,target,entity,speed);
        if(hit&&entity.ammo.id==='anvil'&&target.alive){
          const velocity=this.before.get(entity.body.id)||entity.body.velocity;
          const stillAtContact=target.body.position.x===targetX&&target.body.position.y===targetY;
          const topLanding=stillAtContact&&velocity.y>0&&Math.abs(n.y)>.5&&point.y>entity.body.position.y+entity.ammo.size*.15&&point.y<target.body.position.y;
          if(topLanding)restAnvilOnEnemy(this,entity,target);
        }
        if(hit&&entity.ignited&&entity.ammo.id==='cobble')burnEnemy(this,target,`ammo:${entity.id}`,{totalDamage:50});
        return;
      }
      if(!armoredMob(target))this.hurt(target,impactDamage(speed,mass,targetMass));
    };
    if(ea?.type==='enemy')contactDamage(ea,eb,b.mass,a.mass);
    if(eb?.type==='enemy')contactDamage(eb,ea,a.mass,b.mass);
    // Loyalty ignores every terrain/debris contact on the return leg.
    if(ea?.ammo?.id==='trident'&&ea.returning||eb?.ammo?.id==='trident'&&eb.returning)return;
    // A fire charge must resolve its impact even when it hits an older projectile.
    const ammo=ea?.ammo?.id==='fire'?ea:eb?.ammo?.id==='fire'?eb:ea?.type==='ammo'?ea:eb?.type==='ammo'?eb:null;
    const other=ammo===ea?eb:ea,otherBody=ammo===ea?b:a;
    if(ammo){
      const kind=ammo.ammo.id;
      if(kind==='snowball'){
        if(other?.type==='enemy')freezeEnemy(this,other);
        this.remove(ammo);return;
      }
      if(kind==='wind'){this.remove(ammo);gust(this,point.x,point.y);return;}
      if(kind==='water'){this.remove(ammo);splashWater(this,point.x,point.y);return;}
      if(kind==='fire'){
        const sourceId=`ammo:${ammo.id}`;
        if(other?.type==='enemy')burnEnemy(this,other,sourceId);
        else{
          const sign=(ammo.body.position.x-point.x)*n.x+(ammo.body.position.y-point.y)*n.y>=0?1:-1;
          igniteImpact(this,point.x,point.y,{x:n.x*sign,y:n.y*sign},sourceId);
        }
        this.remove(ammo);if(other?.ammo?.id==='fire')this.remove(other);return;
      }
      if(kind==='anvil'){
        const velocity=this.before.get(ammo.body.id)||ammo.body.velocity;
        if(!ammo.restingOnEnemy&&(otherBody.plugin.terrain||other?.type==='debris')&&velocity.y>0&&Math.abs(n.y)>.5&&point.y>ammo.body.position.y+ammo.ammo.size*.15){
          ammo.plunging=true;ammo.body.isSensor=true;
          // Matter caches sensor state on existing pairs; changing the body alone
          // leaves the first debris contact physically blocking the new drill.
          for(const contact of this.engine.pairs.list)if(contact.bodyA.parent===ammo.body||contact.bodyB.parent===ammo.body)contact.isSensor=true;
        }
        // Only the gradual downward drill removes blocks.
        return;
      }
      if(['cobble','tnt','trident'].includes(kind)&&(otherBody.plugin.glass||pair.glassContact)){this.shatterGlass(otherBody,point,speed);return;}
      // A trident's point cuts glass only; creature damage is resolved above.
      if(kind==='trident')return;
      if(kind==='tnt')return;
      if(kind==='ender'&&ammo.uses===0&&Math.hypot((this.before.get(ammo.body.id)||ammo.body.velocity).x,(this.before.get(ammo.body.id)||ammo.body.velocity).y)*60>=180&&(otherBody.plugin.terrain||other?.type==='debris')){
        const velocity=this.before.get(ammo.body.id)||ammo.body.velocity;
        const exit=findSafeExit((x,y)=>!!this.sample(x,y),ammo.body.position,velocity,ammo.ammo.size/2,TILE*2,this.s/2,n);
        if(exit){
          const old={...ammo.body.position};this.M.Body.setPosition(ammo.body,exit);this.M.Body.setVelocity(ammo.body,{x:velocity.x*.95,y:velocity.y*.95});
          this.M.Sleeping.set(ammo.body,false);ammo.uses++;ammo.expiresAt=this.time+5;this.stats.portals++;this.events.push({type:'portal',x:old.x,y:old.y,to:exit});return;
        }
      }
      if(kind==='ender')return;
      if(kind==='slimeball')return;
    }
    const striker=ammo||((ea?.type==='debris'&&b.plugin.terrain)?ea:(eb?.type==='debris'&&a.plugin.terrain)?eb:null);
    if(striker&&speed>180){
      const heavy=striker.ammo?.id==='anvil',power=clamp(speed*Math.sqrt(Math.min(15,striker.body.mass))*(heavy?.19:.13),15,heavy?360:240),radius=clamp(10+speed*(heavy?.025:.018),15,heavy?42:31);
      const material=this.sample(point.x,point.y)||this.sample(point.x,point.y+this.s)||3;
      this.damageDisk(point.x,point.y,radius,power);
      this.events.push({type:'impact',x:point.x,y:point.y,m:material,speed,sound:heavy?'anvil_land':striker.type==='ammo'&&striker.ammo.id==='cobble'?'stone':MATERIALS[material]?.sound});
    }
  }
  ignite(x,y,reach,sourceId){return igniteWood(this,x,y,reach,sourceId);}
  shatterGlass(body,point,speed){
    const entity=body.plugin.entity;
    if(entity?.type==='debris'){
      const removed=this.damageDebris(entity,point.x,point.y,TILE,Infinity,{onlyMaterial:6});this.stats.removed+=removed;
      if(removed)this.events.push({type:'impact',x:point.x,y:point.y,sound:'glass',speed:Math.max(300,speed)});return;
    }
    const id=body.plugin.tileId,cols=Math.ceil(this.grid.width/16),tx=id%cols*16,ty=Math.floor(id/cols)*16;let count=0;
    for(let y=ty;y<ty+16;y++)for(let x=tx;x<tx+16;x++)if(this.grid.get(x,y)===6){this.removeTerrainPixel(x,y);if(count%5===0)this.emitPixel((x+.5)*this.s,(y+.5)*this.s,6);count++;}
    this.stats.removed+=count;if(count)this.events.push({type:'impact',x:point.x,y:point.y,sound:'glass',speed:Math.max(300,speed)});
  }
  step(dt){
    this.time+=dt;advanceFire(this);this.lava.advance();this.synchronize();this.patrol(dt);
    this.before=new Map();
    for(const e of this.allMoving()){
      if(e.type==='ammo')advanceWeapon(this,e,dt);if(e.dead)continue;
      const b=e.body,speed=Math.hypot(b.velocity.x,b.velocity.y),limit=e.type==='ammo'?speedLimit(e.ammo):26;
      if(e.type==='ammo'&&!b.isStatic&&!e.plunging)projectileGravity(this.M,b,e.ammo,this.engine.gravity);
      if(speed>limit)this.M.Body.setVelocity(b,{x:b.velocity.x/speed*limit,y:b.velocity.y/speed*limit});
      if(Math.abs(b.angularVelocity)>.28)this.M.Body.setAngularVelocity(b,Math.sign(b.angularVelocity)*.28);
      this.before.set(b.id,{...b.velocity,omega:b.angularVelocity});
    }
    this.synchronize();this.contacts.length=0;this.M.Engine.update(this.engine,dt*1000);
    // Turning around can leave a trident inside an existing outbound sensor pair.
    // Query live overlap on the return leg; per-leg hit sources prevent repeats.
    for(const p of this.projectiles)if(!p.dead&&p.returning){
      const hits=this.M.Query.collides(p.body,this.enemies.filter(e=>e.alive&&!e.dead).map(e=>e.body));
      for(const hit of hits){const e=hit.bodyA.parent.plugin.entity?.type==='enemy'?hit.bodyA.parent.plugin.entity:hit.bodyB.parent.plugin.entity;if(e?.type==='enemy')projectileDamage(this,e,p,1500);}
    }
    for(const p of this.projectiles)if(!p.dead&&p.ammo.id==='cobble'&&!p.ignited&&this.lava.touchesCircle(p.body.position.x,p.body.position.y,p.ammo.size/2)){
      p.ignited=true;this.events.push({type:'fire',x:p.body.position.x,y:p.body.position.y,sound:'fire_burn'});
    }
    for(const pair of this.contacts)this.processContact(pair);
    for(const p of this.projectiles){
      if(p.dead)continue;p.age+=dt;p.fuse-=dt;
      if(p.ammo.id==='trident'&&!p.returning){const {x,y}=p.body.position,half=p.ammo.size/2;if(x<half||x>this.width-half||y<half||y>this.height-half)recallTrident(this,p);}
      if(p.ammo.id==='water'&&this.lava.touchesCircle(p.body.position.x,p.body.position.y,p.ammo.size/2)){
        const pos={...p.body.position};this.remove(p);splashWater(this,pos.x,pos.y);continue;
      }
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
      if(y>this.height+200||x< -250||x>this.width+250){if(e.ammo?.id==='trident')recallTrident(this,e);else{if(e.type==='enemy'&&e.alive)this.hurt(e,Math.max(3,e.hp+1));this.remove(e);}}
      if(e.type==='enemy'&&!e.alive&&this.time-e.deathAt>=DEATH_TOPPLE){
        this.events.push({type:'death',x,y:y+22});this.remove(e);
      }
      if(e.type==='ammo'&&(e.ammo.id==='ender'?this.time>=e.expiresAt+.75:e.age>18&&!['cobble','crystal','anvil','trident'].includes(e.ammo.id)))this.remove(e);
    }
    this.projectiles=this.projectiles.filter(e=>!e.dead);this.debris=this.debris.filter(e=>!e.dead);
    this.synchronize();
    if(this.cooldowns.size>1000)for(const [key,t] of this.cooldowns)if(this.time-t>1)this.cooldowns.delete(key);
  }
  active(){return this.lava.settling||this.fires.length>0||this.enemies.some(e=>e.alive&&(e.burnTicks.length>0||e.lavaDamageAt>this.time))||this.projectiles.some(p=>!p.dead&&(p.fuse<Infinity||p.ammo.id==='trident'||p.ammo.id==='anvil'&&p.expiresAt<Infinity||(!p.body.isSleeping&&Math.hypot(p.body.velocity.x,p.body.velocity.y)>.15)))||this.debris.some(e=>!e.body.isSleeping&&e.body.speed>.25);}
  snapshot(){return {time:this.time,removed:this.stats.removed,backgroundRemoved:this.stats.backgroundRemoved,explosions:this.stats.explosions,portals:this.stats.portals,
    physics:'Matter.js',bodies:this.M.Composite.allBodies(this.engine.world).length,
    debris:this.debris.length,enemiesAlive:this.enemies.filter(e=>e.alive).length,lava:this.lava.snapshot(),lavaCells:this.lava.cells.size,lavaCooled:this.stats.lavaCooled,
    projectiles:this.projectiles.map(p=>({id:p.ammo.id,x:p.body.position.x,y:p.body.position.y,angle:p.body.angle,speed:p.body.speed*60,sleeping:p.body.isSleeping,uses:p.uses,ignited:p.ignited,returning:!!p.returning,planted:!!p.planted,placed:!!p.placed,healingOwner:p.healingOwner??null,echoReflectedBy:p.echoReflectedBy??null,opacity:projectileOpacity(p,this.time)})),
    particlesPending:this.events.length};}
}
