import { WIDTH,HEIGHT,PIXEL,TILE,AMMO,MATERIALS,clamp } from './config.mjs';
import {predictArc,arcRevision} from './aim.mjs';
import {MobSprites} from './mobs.mjs';
import {tntFlash} from './animation.mjs';
export class Renderer {
  constructor(canvas,assets){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.assets=assets;
    this.terrain=document.createElement('canvas');this.terrain.width=512;this.terrain.height=288;
    this.tctx=this.terrain.getContext('2d');this.version=-1;this.pictures=new WeakMap();this.particles=[];this.effects=[];this.scene=null;
    this.wood=this.ctx.createPattern(assets.images.oak_planks,'repeat');this.wood.setTransform(new DOMMatrix().scale(3));
    this.mobSprites=new MobSprites(assets);this.rearCanvas=document.createElement('canvas');this.rearCanvas.width=512;this.rearCanvas.height=288;
    this.rearPictures=new WeakMap();this.rearVersion=-1;this.arcKey='';
    this.background=document.createElement('canvas');this.background.width=WIDTH;this.background.height=HEIGHT;this.backgroundReady=false;
  }
  reset(scene){this.scene=scene;this.version=-1;this.rearVersion=-1;this.arcKey='';this.backgroundReady=false;this.pictures=new WeakMap();this.rearPictures=new WeakMap();this.particles=[];this.effects=[];}
  drawRear(world){
    const g=world.rear.grid;
    if(g.version!==this.rearVersion){
      const c=this.rearCanvas.getContext('2d'),im=c.createImageData(g.width,g.height);
      for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){
        const m=g.get(x,y);if(!m)continue;const p=this.assets.pixel(m,x,y),k=(y*g.width+x)*4;
        im.data.set([p[0]*.58,p[1]*.58,p[2]*.58,p[3]],k);
      }c.putImageData(im,0,0);this.rearVersion=g.version;
    }
    this.ctx.drawImage(this.rearCanvas,0,0,WIDTH,HEIGHT);
    for(const e of world.debris){if(e.dead||!e.backPixels.length)continue;
      let entry=this.rearPictures.get(e);
      if(!entry||entry.revision!==e.backRevision){
        let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
        for(const p of e.backPixels){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
        const pic=document.createElement('canvas');pic.width=x1-x0+1;pic.height=y1-y0+1;
        const c=pic.getContext('2d'),im=c.createImageData(pic.width,pic.height);
        for(const p of e.backPixels){const color=this.assets.pixel(p.m,p.tx,p.ty),k=((p.y-y0)*pic.width+p.x-x0)*4;im.data.set([color[0]*.58,color[1]*.58,color[2]*.58,color[3]],k);}
        c.putImageData(im,0,0);entry={pic,x:x0,y:y0,revision:e.backRevision};this.rearPictures.set(e,entry);
      }
      const c=this.ctx;c.save();c.translate(e.body.position.x,e.body.position.y);c.rotate(e.body.angle);
      c.drawImage(entry.pic,e.offset.x+entry.x*PIXEL,e.offset.y+entry.y*PIXEL,entry.pic.width*PIXEL,entry.pic.height*PIXEL);c.restore();
    }
  }
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
      else if(event.type==='impact')this.assets.play(event.sound||MATERIALS[event.m]?.sound||'stone',clamp(event.speed/2200,.12,.4));
      else if(event.type==='hole')this.assets.play('portal',.14);
      else if(event.type==='hurt')this.assets.play(event.sound,.18);
      else if(event.type==='ambient'&&navigator.userActivation?.hasBeenActive)this.assets.play(event.sound,.075);
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
    if(kind==='cherry'){
      for(let y=top;y<base;y++)this.image('cherry_log',x*TILE,y*TILE);
      for(const dx of [-1,1]){this.image('cherry_log',(x+dx)*TILE,(top+1)*TILE);this.image('cherry_log',(x+dx)*TILE,top*TILE);}
      for(const [dy,r] of [[-2,1],[-1,3],[0,3],[1,2]])for(let dx=-r;dx<=r;dx++){
        if(dy===1&&Math.abs(dx)<2)continue;this.image('cherry_leaves',(x+dx)*TILE,(top+dy)*TILE);
      }return;
    }
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
      const x=Math.round((sx-90)/3)*3;
      c.fillStyle='#e4edf7';c.fillRect(x,y+18,w,12);c.fillStyle='#fff';c.fillRect(x,y,w,21);c.fillRect(x+30,y-12,w-63,18);
    }
    c.save();c.globalAlpha=.26;
    for(let x=0;x<32;x++){const top=12+((x>>2)%3===0?0:1);for(let y=top;y<14;y++)this.image(y===top?'grass_block_side':'dirt',x*TILE,y*TILE);}
    c.restore();for(const t of this.scene.trees)this.tree(t);
    // A distant, dark rock layer keeps excavated ground visually underground.
    c.save();for(let x=0;x<32;x++)for(let y=14;y<18;y++)this.image(y<16?'dirt':'stone',x*TILE,y*TILE);
    c.fillStyle='#0009';c.fillRect(0,14*TILE,WIDTH,HEIGHT-14*TILE);c.restore();
  }
  mob(e,world){
    this.mobSprites.draw(this.ctx,e,world);
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
    const c=this.ctx,p=state.pouch,left={x:171,y:535},right={x:239,y:520};
    const band=(a,b,width,color)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='butt';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();};
    c.save();c.imageSmoothingEnabled=true;c.drawImage(this.assets.images.slingshot_frame,137,488,138,184);c.restore();
    band(left,p,8,'#34251c');band(left,p,4,'#98765b');
    c.fillStyle='#563824';c.beginPath();c.roundRect(p.x-18,p.y-9,36,22,7);c.fill();c.strokeStyle='#b68b5d';c.lineWidth=2;c.stroke();
    if(state.loaded)this.ball(p.x,p.y,state.ammo);
    band(right,{x:p.x+13,y:p.y+10},9,'#39271c');band(right,{x:p.x+13,y:p.y+10},4,'#b48c63');
    if(state.drag){
      const key=`${state.ammo.id}:${p.x.toFixed(1)}:${p.y.toFixed(1)}:${state.vx.toFixed(1)}:${state.vy.toFixed(1)}:${arcRevision(world)}`;
      if(key!==this.arcKey){this.arcKey=key;this.arc=predictArc(world,state.ammo.id,p,state.vx,state.vy);}
      c.fillStyle='#ffffffbb';for(const {x,y} of this.arc)c.fillRect(Math.round(x/3)*3,Math.round(y/3)*3,6,6);
      c.fillStyle='#202a32c9';c.fillRect(116,697,120,30);c.fillStyle='#fff';c.font='16px system-ui';c.fillText(`${Math.round(state.power*100)}%`,145,719);
    }
  }
  draw(world,launcher,paused=false){
    const c=this.ctx;c.imageSmoothingEnabled=false;
    if(!this.backgroundReady){this.ctx=this.background.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;this.backdrop(0);this.ctx=c;this.backgroundReady=true;}
    c.drawImage(this.background,0,0);this.drawRear(world);this.cacheGrid(world.grid);c.drawImage(this.terrain,0,0,WIDTH,HEIGHT);
    for(const e of world.debris){if(e.dead)continue;c.save();c.translate(e.body.position.x,e.body.position.y);c.rotate(e.body.angle);c.drawImage(this.cachePiece(e),e.offset.x,e.offset.y,e.w*PIXEL,e.h*PIXEL);c.restore();}
    for(const e of world.enemies)if(!e.dead)this.mob(e,world);
    this.launcher(launcher,world);
    for(const p of world.projectiles){if(p.dead)continue;c.save();c.translate(p.body.position.x,p.body.position.y);c.rotate(p.body.angle);
      this.ball(0,0,p.ammo);if(p.ammo.id==='tnt'&&tntFlash(p.fuse)){c.globalAlpha=.45;c.fillStyle='#fff';c.fillRect(-16,-16,32,32);}c.restore();}
    for(const p of this.particles){c.globalAlpha=Math.min(1,p.life/.8);c.fillStyle=p.color;c.fillRect(Math.round(p.x/3)*3,Math.round(p.y/3)*3,p.size,p.size);}c.globalAlpha=1;
    for(const v of world.vortices){c.save();c.globalAlpha=Math.min(1,v.life/.4);this.hole(v.x,v.y,world.time,20+Math.min(65,v.age*20));c.restore();}
    for(const e of this.effects){
      if(e.type==='explosion'){const frame=Math.min(15,Math.floor((1-e.life/e.total)*16)),size=e.radius*2;c.drawImage(this.assets.explosions[frame],e.x-size/2,e.y-size/2,size,size);}
      else if(e.type==='portal'){c.fillStyle='#ad65dc';c.globalAlpha=e.life/e.total;for(const p of [e,e.to])for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=20+(1-e.life/e.total)*30;c.fillRect(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,6,6);}c.globalAlpha=1;}
    }
    if(paused){c.fillStyle='#15232da8';c.fillRect(0,0,WIDTH,HEIGHT);c.fillStyle='#fff';c.textAlign='center';c.font='bold 52px system-ui';c.fillText('已暂停',WIDTH/2,HEIGHT/2);c.textAlign='left';}
  }
}
