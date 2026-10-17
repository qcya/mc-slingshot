import { WIDTH,HEIGHT,PIXEL,TILE,AMMO,MATERIALS,clamp } from './config.mjs';
export const PIVOT={x:205,y:607}, ARM=98, REST=-1.12, RELEASE=-.91;
export const armTip=angle=>({x:PIVOT.x+Math.cos(angle)*ARM,y:PIVOT.y+Math.sin(angle)*ARM});
export class Renderer {
  constructor(canvas,assets){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.assets=assets;
    this.terrain=document.createElement('canvas');this.terrain.width=512;this.terrain.height=288;
    this.tctx=this.terrain.getContext('2d');this.version=-1;this.pictures=new WeakMap();this.particles=[];this.effects=[];this.scene=null;
    this.wood=this.ctx.createPattern(assets.images.oak_planks,'repeat');this.wood.setTransform(new DOMMatrix().scale(3));
  }
  reset(scene){this.scene=scene;this.version=-1;this.pictures=new WeakMap();this.particles=[];this.effects=[];}
  image(name,x,y,w=TILE,h=TILE){this.ctx.drawImage(this.assets.images[name],Math.round(x),Math.round(y),w,h);}
  cacheGrid(grid){
    if(this.version===grid.version)return;
    const image=this.tctx.createImageData(grid.width,grid.height),d=image.data;
    for(let y=0;y<grid.height;y++)for(let x=0;x<grid.width;x++){
      const m=grid.get(x,y);if(!m)continue;const k=(y*grid.width+x)*4,p=this.assets.pixel(m,x,y);
      d[k]=p[0];d[k+1]=p[1];d[k+2]=p[2];d[k+3]=p[3];
    }
    this.tctx.putImageData(image,0,0);this.version=grid.version;
  }
  cachePiece(e){
    let pic=this.pictures.get(e);if(pic)return pic;
    pic=document.createElement('canvas');pic.width=e.w;pic.height=e.h;
    const x=pic.getContext('2d'),im=x.createImageData(e.w,e.h);
    for(let y=0;y<e.h;y++)for(let gx=0;gx<e.w;gx++){
      const m=e.mask[y*e.w+gx];if(!m)continue;const k=(y*e.w+gx)*4,p=this.assets.pixel(m,gx+e.texture.x,y+e.texture.y);im.data.set(p,k);
    }
    x.putImageData(im,0,0);this.pictures.set(e,pic);return pic;
  }
  consume(world){
    for(const event of world.events.splice(0)){
      if(event.type==='pixel'){
        if(this.particles.length>=850)continue;
        const p=this.assets.pixel(event.m||3,Math.floor(event.x/PIXEL),Math.floor(event.y/PIXEL)),a=Math.random()*Math.PI*2,v=70+Math.random()*140;
        this.particles.push({x:event.x,y:event.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-70,color:`rgb(${p[0]},${p[1]},${p[2]})`,life:1.4+Math.random()*1.5,size:3});
      }else if(event.type==='explosion'){this.effects.push({...event,life:.6,total:.6});this.assets.play('explode',.55);}
      else if(event.type==='portal'){this.effects.push({...event,life:.45,total:.45});this.assets.play('portal',.5);}
      else if(event.type==='fuse')this.assets.play('fuse',.35);
      else if(event.type==='impact')this.assets.play(MATERIALS[event.m]?.sound||'stone',clamp(event.speed/2200,.12,.4));
      else if(event.type==='hurt')this.assets.play('zombie_hurt',.18);
    }
  }
  update(world,dt){
    this.consume(world);
    for(const p of this.particles){
      p.life-=dt;for(const v of world.vortices){const dx=v.x-p.x,dy=v.y-p.y,d=Math.hypot(dx,dy);if(d<180){p.vx+=dx/(d||1)*800*dt;p.vy+=dy/(d||1)*800*dt;}}
      p.vy+=550*dt;const lastY=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(world.grid.get(p.x/PIXEL,(p.y+3)/PIXEL)&&p.vy>0){p.y=lastY;p.vy=Math.abs(p.vy)<35?0:-p.vy*.18;p.vx*=.65;}
    }
    this.particles=this.particles.filter(p=>p.life>0&&p.y<HEIGHT+20);
    for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
  }
  tree(tree){
    const {x,base,height,kind}=tree,top=base-height,log=kind==='spruce'?'spruce_log':'oak_log',leaf=kind==='spruce'?'spruce_leaves':'oak_leaves';
    for(let y=top;y<base;y++)this.image(log,x*TILE,y*TILE);
    if(kind==='oak'){
      for(const [dy,r] of [[-1,1],[0,2],[1,2],[2,1]])for(let dx=-r;dx<=r;dx++){
        if(dy===2&&dx===0)continue;this.image(leaf,(x+dx)*TILE,(top+dy)*TILE);
      }
    }else{
      for(const [dy,r] of [[-1,0],[0,1],[1,0],[2,1],[3,2],[4,1]])for(let dx=-r;dx<=r;dx++)this.image(leaf,(x+dx)*TILE,(top+dy)*TILE);
    }
  }
  backdrop(time){
    const c=this.ctx;c.fillStyle='#80b6eb';c.fillRect(0,0,WIDTH,HEIGHT);
    // Separate, square MC cloud banks. All edges sit on the pixel grid.
    for(const [sx,y,w] of [[70,96,180],[490,66,270],[1040,120,156],[1400,55,210]]){
      const x=Math.round(((sx+time*1.7)%(WIDTH+300)-90)/3)*3;
      c.fillStyle='#e4edf7';c.fillRect(x,y+18,w,12);c.fillStyle='#fff';c.fillRect(x,y,w,21);c.fillRect(x+30,y-12,w-63,18);
    }
    c.save();c.globalAlpha=.26;
    for(let x=0;x<32;x++){const top=12+((x>>2)%3===0?0:1);for(let y=top;y<14;y++)this.image(y===top?'grass_block_side':'dirt',x*TILE,y*TILE);}
    c.restore();for(const t of this.scene.trees)this.tree(t);
  }
  mob(e,world){
    const c=this.ctx,b=e.body;c.save();c.translate(b.position.x,b.position.y);c.rotate(b.angle);c.translate(0,44);
    if(!e.alive)c.globalAlpha=clamp(1-(world.time-e.deathAt)/3,0,1);
    const im=this.assets.images[e.skin],part=(u,v,w,h,x,y,scale=3)=>c.drawImage(im,u,v,w,h,x,y,w*scale,h*scale);
    if(e.skin==='zombie'){
      part(4,20,4,12,-12,-36);part(4,20,4,12,0,-36);
      part(20,20,8,12,-12,-72);part(44,20,4,12,-24,-72);part(44,20,4,12,12,-72);part(8,8,8,8,-12,-96);
    }else{
      const s=2.7;
      part(4,26,4,12,-10.8,-32.4,s);part(4,26,4,12,0,-32.4,s);
      part(22,26,8,12,-10.8,-64.8,s);part(8,8,8,10,-10.8,-91.8,s);part(26,2,2,4,-2.7,-75.6,s);
      part(44,50,4,12,-21.6,-64.8,s);part(44,50,4,12,10.8,-64.8,s);this.image('crossbow_standby',-16,-54,32,32);
    }
    if(e.alive&&e.hp<100){c.fillStyle='#401f22';c.fillRect(-18,-108,36,4);c.fillStyle='#87c95e';c.fillRect(-18,-108,36*Math.max(0,e.hp)/100,4);}
    c.restore();
  }
  ball(x,y,ammo,size=ammo.size){
    if(ammo.sprite){this.image(ammo.sprite,x-size/2,y-size/2,size,size);return;}
    this.hole(x,y,0,18);
  }
  hole(x,y,time,radius){
    const c=this.ctx;c.fillStyle='#7864a2';for(let i=0;i<24;i++){
      const a=i/24*Math.PI*2+time*.7,rr=radius+(i%3)*2;
      c.fillRect(Math.round((x+Math.cos(a)*rr)/3)*3,Math.round((y+Math.sin(a)*rr*.7)/3)*3,3,3);
    }
    c.fillStyle='#1b152c';c.fillRect(x-12,y-12,24,24);c.fillStyle='#05050a';c.fillRect(x-9,y-15,18,30);c.fillRect(x-15,y-9,30,18);
  }
  beam(x1,y1,x2,y2,width){
    const c=this.ctx;c.save();c.translate(x1,y1);c.rotate(Math.atan2(y2-y1,x2-x1));const length=Math.hypot(x2-x1,y2-y1);
    c.fillStyle='#38291e';c.fillRect(-2,-width/2-3,length+4,width+6);c.fillStyle=this.wood;c.fillRect(0,-width/2,length,width);c.restore();
  }
  launcher(state,world){
    const c=this.ctx;for(const x of [151,266]){
      c.save();c.translate(x,647);c.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4;c.lineTo(Math.cos(a)*25,Math.sin(a)*25);}c.closePath();c.fillStyle='#33261d';c.fill();c.clip();c.fillStyle=this.wood;c.fillRect(-20,-20,40,40);
      c.fillStyle='#443223';c.fillRect(-3,-24,6,48);c.fillRect(-24,-3,48,6);c.fillStyle='#b9a27a';c.fillRect(-5,-5,10,10);c.restore();
    }
    this.beam(121,627,294,627,15);this.beam(146,622,PIVOT.x,PIVOT.y-5,11);this.beam(270,622,PIVOT.x,PIVOT.y-5,11);
    const tip=armTip(state.angle),back={x:PIVOT.x-Math.cos(state.angle)*32,y:PIVOT.y-Math.sin(state.angle)*32};
    this.beam(back.x,back.y,tip.x,tip.y,11);c.fillStyle=this.wood;c.fillRect(back.x-15,back.y-13,30,26);
    c.fillStyle='#b9a27a';c.fillRect(PIVOT.x-8,PIVOT.y-8,16,16);c.fillStyle='#473628';c.fillRect(PIVOT.x-3,PIVOT.y-3,6,6);
    this.beam(tip.x-22,tip.y+16,tip.x+22,tip.y+16,7);this.beam(tip.x-22,tip.y+16,tip.x-26,tip.y+1,5);this.beam(tip.x+22,tip.y+16,tip.x+26,tip.y+1,5);
    if(state.loaded)this.ball(tip.x,tip.y,state.ammo);
    if(state.drag){
      const p=armTip(RELEASE);c.fillStyle='#ffffffbb';
      for(let t=.12;t<1.7;t+=.12){const x=p.x+state.vx*t,y=p.y+state.vy*t+500*t*t;if(x>WIDTH||y>672)break;c.fillRect(Math.round(x/3)*3,Math.round(y/3)*3,6,6);}
      c.fillStyle='#202a32c9';c.fillRect(118,701,184,30);c.fillStyle='#fff';c.font='16px system-ui';c.fillText(`力度 ${Math.round(state.power*100)}%`,133,723);
    }
  }
  draw(world,launcher,paused=false){
    const c=this.ctx;c.imageSmoothingEnabled=false;this.backdrop(world.time);this.cacheGrid(world.grid);c.drawImage(this.terrain,0,0,WIDTH,HEIGHT);
    for(const e of world.debris){if(e.dead)continue;c.save();c.translate(e.body.position.x,e.body.position.y);c.rotate(e.body.angle);c.drawImage(this.cachePiece(e),e.offset.x,e.offset.y,e.w*PIXEL,e.h*PIXEL);c.restore();}
    for(const e of world.enemies)if(!e.dead)this.mob(e,world);
    this.launcher(launcher,world);
    for(const p of world.projectiles){if(p.dead)continue;c.save();c.translate(p.body.position.x,p.body.position.y);c.rotate(p.body.angle);
      this.ball(0,0,p.ammo);if(p.ammo.id==='tnt'&&p.fuse<1&&Math.floor(p.fuse*12)%2===0){c.globalAlpha=.4;c.fillStyle='#fff';c.fillRect(-16,-16,32,32);}c.restore();}
    for(const p of this.particles){c.globalAlpha=Math.min(1,p.life/.8);c.fillStyle=p.color;c.fillRect(Math.round(p.x/3)*3,Math.round(p.y/3)*3,p.size,p.size);}c.globalAlpha=1;
    for(const v of world.vortices){c.save();c.globalAlpha=Math.min(1,v.life/.4);this.hole(v.x,v.y,world.time,20+Math.min(65,v.age*20));c.restore();}
    for(const e of this.effects){
      if(e.type==='explosion'){const frame=Math.min(15,Math.floor((1-e.life/e.total)*16)),size=e.radius*2;c.drawImage(this.assets.explosions[frame],e.x-size/2,e.y-size/2,size,size);}
      else if(e.type==='portal'){c.fillStyle='#ad65dc';c.globalAlpha=e.life/e.total;for(const p of [e,e.to])for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=20+(1-e.life/e.total)*30;c.fillRect(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,6,6);}c.globalAlpha=1;}
    }
    if(paused){c.fillStyle='#15232da8';c.fillRect(0,0,WIDTH,HEIGHT);c.fillStyle='#fff';c.textAlign='center';c.font='bold 52px system-ui';c.fillText('已暂停',WIDTH/2,HEIGHT/2);c.textAlign='left';}
  }
}
