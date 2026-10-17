import { AMMO, MATERIALS, clamp } from './config.mjs';
import { PixelGrid, meshPixels, components, cropPixels, findSafeExit, impactDamage } from './pixels.mjs';

// Pixels own material state; Matter owns ALL rigid-body motion and contacts.
// No fallback integrator and no permanent invisible plane beneath damaged soil.
export class SiegeWorld {
  constructor(Matter,{grid=new PixelGrid(512,288),pixelSize=3}={}){
    if(!Matter?.Engine)throw new Error('Matter.js 物理引擎未加载，请重新启动游戏。');
    this.M=Matter;this.grid=grid;this.s=pixelSize;
    this.width=grid.width*pixelSize;this.height=grid.height*pixelSize;
    this.engine=Matter.Engine.create({enableSleeping:true,positionIterations:8,velocityIterations:8,gravity:{x:0,y:1,scale:.001}});
    this.staticTiles=new Map();this.projectiles=[];this.debris=[];this.enemies=[];
    this.vortices=[];this.events=[];this.contacts=[];this.cooldowns=new Map();
    this.time=0;this.serial=0;this.stats={removed:0,explosions:0,portals:0,enemyDamage:0};
    Matter.Events.on(this.engine,'collisionStart',event=>this.contacts.push(...event.pairs));
    this.synchronize(false);
  }
  allMoving(){return [...this.projectiles,...this.debris,...this.enemies].filter(e=>!e.dead);}
  register(entity,body){
    entity.id=++this.serial;entity.body=body;body.plugin.entity=entity;
    this.M.Composite.add(this.engine.world,body);return entity;
  }
  remove(entity){if(!entity||entity.dead)return;entity.dead=true;this.M.Composite.remove(this.engine.world,entity.body);}
  spawnProjectile(kind,x,y,vx,vy){
    const ammo=AMMO.find(a=>a.id===kind);if(!ammo)throw new Error(`Unknown ammunition: ${kind}`);
    const options={friction:.85,frictionStatic:1.2,frictionAir:.0015,restitution:kind==='cobble'?.14:.07,slop:.025,sleepThreshold:75};
    const body=(kind==='cobble'||kind==='tnt')?this.M.Bodies.rectangle(x,y,ammo.size,ammo.size,options):this.M.Bodies.circle(x,y,ammo.size/2,options,16);
    this.M.Body.setMass(body,ammo.mass);
    this.M.Body.setVelocity(body,{x:vx/60,y:vy/60});
    const p=this.register({type:'ammo',ammo,age:0,fuse:kind==='tnt'?2.8:Infinity,uses:0},body);
    this.projectiles.push(p);return p;
  }
  addEnemy(x,feetY,skin='zombie'){
    const body=this.M.Bodies.rectangle(x,feetY-44,24,88,{friction:.85,frictionStatic:1,restitution:0,frictionAir:.01,slop:.025,inertia:Infinity});
    this.M.Body.setMass(body,1.2);
    const e=this.register({type:'enemy',skin,hp:100,alive:true,deathAt:0},body);this.enemies.push(e);return e;
  }
  synchronize(detach=true){
    if(!this.grid.dirty.size)return;
    if(detach)this.detachUnsupported();
    const cols=Math.ceil(this.grid.width/16);
    for(const id of this.grid.dirty){
      const old=this.staticTiles.get(id);if(old)this.M.Composite.remove(this.engine.world,old);
      this.staticTiles.delete(id);
      const tx=id%cols*16,ty=Math.floor(id/cols)*16,w=Math.min(16,this.grid.width-tx),h=Math.min(16,this.grid.height-ty);
      const mask=new Uint8Array(w*h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++)mask[y*w+x]=this.grid.get(tx+x,ty+y);
      const rects=meshPixels(mask,w,h);if(!rects.length)continue;
      const parts=rects.map(r=>this.M.Bodies.rectangle((tx+r.x+r.w/2)*this.s,(ty+r.y+r.h/2)*this.s,r.w*this.s,r.h*this.s,{isStatic:true,friction:.8,frictionStatic:1.2,restitution:0,slop:.025}));
      const body=parts.length===1?parts[0]:this.M.Body.create({parts,isStatic:true,friction:.8,frictionStatic:1.2,slop:.025});
      body.plugin.terrain=true;this.staticTiles.set(id,body);this.M.Composite.add(this.engine.world,body);
    }
    this.grid.dirty.clear();
  }
  detachUnsupported(){
    const {width:w,height:h,cells}=this.grid,seen=new Uint8Array(cells.length),queue=[];
    // The indestructible bottom row is the anchor. Four-neighbour connectivity
    // permits severed terrain as well as buildings to become physical islands.
    for(let x=0;x<w;x++){const k=(h-1)*w+x;if(cells[k]){seen[k]=1;queue.push(k);}}
    for(let q=0;q<queue.length;q++){
      const k=queue[q],x=k%w,y=Math.floor(k/w);
      const visit=n=>{if(cells[n]&&!seen[n]){seen[n]=1;queue.push(n);}};
      if(x>0)visit(k-1);if(x+1<w)visit(k+1);if(y>0)visit(k-w);if(y+1<h)visit(k+w);
    }
    const islands=components(cells,w,h,seen);
    for(const indices of islands){
      const piece=cropPixels(cells,w,indices);
      for(const k of indices)this.grid.set(k%w,Math.floor(k/w),0);
      if(indices.length<6){for(const k of indices)this.emitPixel(k%w*this.s,Math.floor(k/w)*this.s,piece.mask.find(m=>m));continue;}
      this.addDebris(piece.mask,piece.w,piece.h,{x:piece.x*this.s,y:piece.y*this.s},{x:piece.x,y:piece.y});
    }
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
    const entity=this.register({type:'debris',mask,w,h,hp,offset,texture,revision:0,count:mask.reduce((n,m)=>n+!!m,0)},body);
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
  flushGridPixels(){for(const p of this.grid.recent)if((p.x*7+p.y*11+this.stats.removed)%5===0)this.emitPixel((p.x+.5)*this.s,(p.y+.5)*this.s,p.m);this.grid.recent.length=0;}
  damageDisk(x,y,radius,power,options={}){
    let n=this.grid.damageDisk(x/this.s,y/this.s,radius/this.s,power,options);
    this.flushGridPixels();
    for(const e of [...this.debris])if(!e.dead)n+=this.damageDebris(e,x,y,radius,power,options);
    this.stats.removed+=n;return n;
  }
  damageDebris(e,x,y,radius,power,{budget=Infinity}={}){
    const center=this.localPoint(e,x,y),r=radius/this.s;let n=0;
    for(let gy=Math.max(0,Math.floor(center.y-r));gy<Math.min(e.h,Math.ceil(center.y+r));gy++)for(let gx=Math.max(0,Math.floor(center.x-r));gx<Math.min(e.w,Math.ceil(center.x+r));gx++){
      const k=gy*e.w+gx,m=e.mask[k];if(!m||m===7)continue;
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
    for(const indices of components(e.mask,e.w,e.h)){
      const piece=cropPixels(e.mask,e.w,indices),origin=this.worldPoint(e,piece.x,piece.y);
      if(indices.length<6){for(const k of indices){const p=this.worldPoint(e,k%e.w,Math.floor(k/e.w));this.emitPixel(p.x,p.y,e.mask[k]);}continue;}
      const child=this.addDebris(piece.mask,piece.w,piece.h,origin,{x:e.texture.x+piece.x,y:e.texture.y+piece.y},angle,velocity,omega);
      // Preserve local impact damage, not just transparent holes.
      for(let y=0;y<piece.h;y++)for(let x=0;x<piece.w;x++)child.hp[y*piece.w+x]=e.hp[(y+piece.y)*e.w+x+piece.x];
      const dx=child.body.position.x-pose.x,dy=child.body.position.y-pose.y;
      this.M.Body.setVelocity(child.body,{x:velocity.x-omega*dy,y:velocity.y+omega*dx});
    }
  }
  hurt(e,damage){
    if(!e.alive||!Number.isFinite(damage)||damage<3)return;e.hp-=damage;this.stats.enemyDamage+=damage;
    this.events.push({type:'hurt',x:e.body.position.x,y:e.body.position.y});
    if(e.hp<=0){e.alive=false;e.deathAt=this.time;this.M.Body.setInertia(e.body,1600);this.M.Body.setAngularVelocity(e.body,.05);}
  }
  blast(x,y,radius=98,power=160){
    this.stats.explosions++;this.events.push({type:'explosion',x,y,radius});
    this.damageDisk(x,y,radius,power,{jagged:true,seed:this.stats.explosions});this.synchronize();
    for(const e of this.allMoving()){
      const dx=e.body.position.x-x,dy=e.body.position.y-y,d=Math.hypot(dx,dy),reach=radius+50;if(d>reach)continue;
      const force=(1-d/reach)*.005*e.body.mass;
      this.M.Sleeping.set(e.body,false);this.M.Body.applyForce(e.body,e.body.position,{x:dx/(d||1)*force,y:(dy/(d||1)-.3)*force});
      if(e.type==='enemy')this.hurt(e,Math.max(0,180*(1-d/reach)));
    }
  }
  attachHole(p,target,point){
    const anchor=target?.type==='debris'?target:null;
    const v={x:point.x,y:point.y,age:0,life:4.2,tick:0,radius:112,anchor,local:anchor?this.localPoint(anchor,point.x,point.y):null};
    this.vortices.push(v);this.remove(p);this.events.push({type:'hole',x:v.x,y:v.y});
  }
  processContact(pair){
    const a=pair.bodyA.parent,b=pair.bodyB.parent;if(a===b)return;
    const key=a.id<b.id?`${a.id}:${b.id}`:`${b.id}:${a.id}`;
    if(this.time-(this.cooldowns.get(key)??-100)<.14)return;this.cooldowns.set(key,this.time);
    const ea=a.plugin.entity,eb=b.plugin.entity;if(ea?.dead||eb?.dead)return;
    const va=this.before.get(a.id)||a.velocity,vb=this.before.get(b.id)||b.velocity,n=pair.collision.normal;
    const speed=Math.abs((va.x-vb.x)*n.x+(va.y-vb.y)*n.y)*60;
    const supports=pair.collision.supports.filter(Boolean);
    const point=supports.length?{x:supports.reduce((t,p)=>t+p.x,0)/supports.length,y:supports.reduce((t,p)=>t+p.y,0)/supports.length}:{x:(a.position.x+b.position.x)/2,y:(a.position.y+b.position.y)/2};
    if(ea?.type==='enemy')this.hurt(ea,impactDamage(speed,b.mass,a.mass));
    if(eb?.type==='enemy')this.hurt(eb,impactDamage(speed,a.mass,b.mass));
    const ammo=ea?.type==='ammo'?ea:eb?.type==='ammo'?eb:null;
    const other=ammo===ea?eb:ea,otherBody=ammo===ea?b:a;
    if(ammo){
      const kind=ammo.ammo.id;
      if(kind==='tnt'){if(ammo.fuse>.55){ammo.fuse=.55;this.events.push({type:'fuse',x:point.x,y:point.y});}return;}
      if(kind==='blackhole'){this.attachHole(ammo,other,point);return;}
      if(kind==='ender'&&ammo.uses===0&&(otherBody.plugin.terrain||other?.type==='debris')){
        const velocity=this.before.get(ammo.body.id)||ammo.body.velocity;
        const exit=findSafeExit((x,y)=>!!this.sample(x,y),ammo.body.position,velocity,ammo.ammo.size/2,64,this.s/2);
        if(exit){
          const old={...ammo.body.position};this.M.Body.setPosition(ammo.body,exit);this.M.Body.setVelocity(ammo.body,{x:velocity.x*.95,y:velocity.y*.95});
          this.M.Sleeping.set(ammo.body,false);ammo.uses++;this.stats.portals++;this.events.push({type:'portal',x:old.x,y:old.y,to:exit});return;
        }
      }
    }
    const striker=ammo||((ea?.type==='debris'&&b.plugin.terrain)?ea:(eb?.type==='debris'&&a.plugin.terrain)?eb:null);
    if(striker&&speed>180){
      const power=clamp(speed*Math.sqrt(Math.min(15,striker.body.mass))*.13,15,240),radius=clamp(10+speed*.018,15,31);
      const material=this.sample(point.x,point.y)||this.sample(point.x,point.y+this.s)||3;
      this.damageDisk(point.x,point.y,radius,power);
      this.events.push({type:'impact',x:point.x,y:point.y,m:material,speed});
    }
  }
  updateHoles(dt){
    for(const v of this.vortices){
      v.age+=dt;v.life-=dt;v.tick+=dt;
      if(v.anchor&&!v.anchor.dead){const p=this.worldPoint(v.anchor,v.local.x,v.local.y);v.x=p.x;v.y=p.y;}
      if(v.tick>=.1&&v.life>0){v.tick-=.1;this.damageDisk(v.x,v.y,Math.min(v.radius,20+v.age*28),100,{budget:96});}
      for(const e of this.allMoving()){
        const dx=v.x-e.body.position.x,dy=v.y-e.body.position.y,d=Math.hypot(dx,dy);if(d>v.radius*1.7)continue;
        const acceleration=.0018*clamp(1-d/(v.radius*2),.2,1);
        this.M.Sleeping.set(e.body,false);this.M.Body.applyForce(e.body,e.body.position,{x:dx/(d||1)*e.body.mass*acceleration,y:dy/(d||1)*e.body.mass*acceleration});
        if(e.type==='enemy'&&d<26)this.hurt(e,140*dt);
      }
    }
    this.vortices=this.vortices.filter(v=>v.life>0);
  }
  step(dt){
    this.time+=dt;this.synchronize();this.updateHoles(dt);
    this.before=new Map();
    for(const e of this.allMoving()){
      const b=e.body,speed=Math.hypot(b.velocity.x,b.velocity.y);
      if(speed>26)this.M.Body.setVelocity(b,{x:b.velocity.x/speed*26,y:b.velocity.y/speed*26});
      if(Math.abs(b.angularVelocity)>.28)this.M.Body.setAngularVelocity(b,Math.sign(b.angularVelocity)*.28);
      this.before.set(b.id,{...b.velocity});
    }
    this.contacts.length=0;this.M.Engine.update(this.engine,dt*1000);
    for(const pair of this.contacts)this.processContact(pair);
    for(const p of this.projectiles){
      if(p.dead)continue;p.age+=dt;p.fuse-=dt;
      if(p.ammo.id==='tnt'&&p.fuse<=0){const pos={...p.body.position};this.remove(p);this.blast(pos.x,pos.y);}
    }
    for(const e of this.allMoving()){
      const {x,y}=e.body.position;
      if(y>this.height+200||x< -250||x>this.width+250){if(e.type==='enemy'&&e.alive)this.hurt(e,250);this.remove(e);}
      if(e.type==='enemy'&&!e.alive&&this.time-e.deathAt>3)this.remove(e);
      if(e.type==='ammo'&&e.age>18&&e.ammo.id!=='cobble')this.remove(e);
    }
    this.projectiles=this.projectiles.filter(e=>!e.dead);this.debris=this.debris.filter(e=>!e.dead);
    this.synchronize();
    if(this.cooldowns.size>1000)for(const [key,t] of this.cooldowns)if(this.time-t>1)this.cooldowns.delete(key);
  }
  active(){return this.vortices.length>0||this.projectiles.some(p=>!p.dead&&(p.fuse<Infinity||(!p.body.isSleeping&&Math.hypot(p.body.velocity.x,p.body.velocity.y)>.15)))||this.debris.some(e=>!e.body.isSleeping&&e.body.speed>.25);}
  snapshot(){return {time:this.time,removed:this.stats.removed,explosions:this.stats.explosions,portals:this.stats.portals,
    physics:'Matter.js',bodies:this.M.Composite.allBodies(this.engine.world).length,
    debris:this.debris.length,blackholes:this.vortices.length,enemiesAlive:this.enemies.filter(e=>e.alive).length,
    projectiles:this.projectiles.map(p=>({id:p.ammo.id,x:p.body.position.x,y:p.body.position.y,angle:p.body.angle,speed:p.body.speed*60,sleeping:p.body.isSleeping,uses:p.uses})),
    particlesPending:this.events.length};}
}
