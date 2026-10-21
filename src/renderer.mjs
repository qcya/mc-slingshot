import { WIDTH,HEIGHT,PIXEL,TILE,AMMO,MATERIALS,clamp } from './config.mjs';
import {predictArc,arcRevision} from './aim.mjs';
import {MobSprites} from './mobs.mjs';
import {tntFlash,DEATH_POOF} from './animation.mjs';
import {SLING_HOME,SLING_FRAME,pocketGeometry} from './sling.mjs';
import {projectileOpacity} from './combat.mjs';
import {skyAndLandscape,dimensionLandscape,driftingClouds,rearPixel,foregroundPixel,contactShadows} from './scenery.mjs';
import {makeSlingArt} from './sling-art.mjs';
import {drawTrident,drawEndCrystal} from './combat-render.mjs';
import {ENCOUNTER_PROFILES} from './encounters.mjs';
export class Renderer {
  constructor(canvas,assets){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.assets=assets;
    this.terrain=document.createElement('canvas');this.terrain.width=512;this.terrain.height=288;
    this.tctx=this.terrain.getContext('2d');this.version=-1;this.pictures=new WeakMap();this.particles=[];this.effects=[];this.scene=null;
    this.wood=this.ctx.createPattern(assets.images.oak_planks,'repeat');this.wood.setTransform(new DOMMatrix().scale(3));
    this.mobSprites=new MobSprites(assets);this.rearCanvas=document.createElement('canvas');this.rearCanvas.width=512;this.rearCanvas.height=288;
    this.rearPictures=new WeakMap();this.rearVersion=-1;this.arcKey='';
    this.background=document.createElement('canvas');this.background.width=WIDTH;this.background.height=HEIGHT;this.backgroundReady=false;
    this.slingPicture=makeSlingArt(assets.colors.oak_log);
  }
  reset(scene){this.scene=scene;this.version=-1;this.rearVersion=-1;this.arcKey='';this.backgroundReady=false;this.pictures=new WeakMap();this.rearPictures=new WeakMap();this.particles=[];this.effects=[];}
  drawRear(world){
    const g=world.rear.grid;
    const revision=g.version;
    if(revision!==this.rearVersion){
      const c=this.rearCanvas.getContext('2d'),im=c.createImageData(g.width,g.height);
      for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){
        const m=g.get(x,y);if(!m)continue;const k=(y*g.width+x)*4;
        im.data.set(rearPixel(this.assets,m,x,y,world,this.scene.visual),k);
      }c.putImageData(im,0,0);this.rearVersion=revision;
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
      const m=grid.get(x,y);if(!m)continue;const k=(y*grid.width+x)*4,p=foregroundPixel(this.assets,m,x,y,grid,this.scene.visual);
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
      }else if(event.type==='death'){
        for(let i=0;i<26;i++){
          const a=i*2.39996,v=18+Math.random()*65,life=DEATH_POOF*(.75+Math.random()*.25);
          this.particles.push({x:event.x+(Math.random()-.5)*42,y:event.y+(Math.random()-.5)*50,vx:Math.cos(a)*v,vy:Math.sin(a)*v-38,color:i%3?'#fff':'#d9d9d9',life,total:life,size:i%2?6:9,poof:true});
        }
      }else if(event.type==='explosion'){this.effects.push({...event,life:.6,total:.6});this.assets.play('explode',.55);}
      else if(event.type==='portal'){this.effects.push({...event,life:.45,total:.45});this.assets.play('portal',.5);}
      else if(event.type==='fuse')this.assets.play('fuse',.35);
      else if(event.type==='fire')this.assets.play(event.sound||'fire_burn',.25);
      else if(event.type==='impact')this.assets.play(event.sound||MATERIALS[event.m]?.sound||'stone',clamp(event.speed/2200,.12,.4));
      else if(event.type==='hurt')this.assets.play(event.sound,.18);
      else if(event.type==='recall')this.assets.play(event.sound||'trident_return',.28);
      else if(event.type==='encounterPulse'&&event.skin!=='wither')this.effects.push({...event,life:.65,total:.65});
      else if(event.type==='summon'){
        this.assets.play(event.sound||'wither_summon',.18);
        for(let i=0;i<14;i++)this.particles.push({x:event.x+(Math.random()-.5)*22,y:event.y-12-Math.random()*65,vx:(Math.random()-.5)*26,vy:-20-Math.random()*30,color:i%2?'#4c4a4e':'#99909b',life:.5+Math.random()*.3,size:3,poof:true});
      }
      else if(event.type==='ambient'&&navigator.userActivation?.hasBeenActive)this.assets.play(event.sound,.075);
      else if(['gust','splash','snow'].includes(event.type)){this.effects.push({...event,life:.4,total:.4});if(event.sound)this.assets.play(event.sound,.25);}
    }
  }
  update(world,dt){
    this.consume(world);
    for(const p of this.particles){
      p.life-=dt;
      if(p.poof){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*3);continue;}
      p.vy+=550*dt;const lastY=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(world.grid.get(p.x/PIXEL,(p.y+3)/PIXEL)&&p.vy>0){p.y=lastY;p.vy=Math.abs(p.vy)<35?0:-p.vy*.18;p.vx*=.65;}
    }
    this.particles=this.particles.filter(p=>p.life>0&&p.y<HEIGHT+20);
    for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
  }
  tree(tree){
    const {x,base,height,kind}=tree,top=base-height,log=kind==='spruce'?'spruce_log':'oak_log',leaf=kind==='spruce'?'spruce_leaves':'oak_leaves';
    if(kind==='cherry'){
      // One-block trunk with short staggered forks, not a filled 3x2 log slab.
      for(let y=top+1;y<base;y++)this.image('cherry_log',x*TILE,y*TILE);
      for(const [dx,dy] of [[-1,1],[-2,0],[1,0]])this.image('cherry_log',(x+dx)*TILE,(top+dy)*TILE);
      // Broad, uneven block canopy conceals the branch tips.
      for(const [dy,lo,hi] of [[-2,-2,1],[-1,-4,3],[0,-4,4],[1,-3,2]])for(let dx=lo;dx<=hi;dx++){
        if(dy===1&&(dx===-1||dx===0))continue;this.image('cherry_leaves',(x+dx)*TILE,(top+dy)*TILE);
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
    const c=this.ctx;
    if(this.scene.dimension&&this.scene.dimension!=='overworld'){dimensionLandscape(c,this.assets,this.scene.dimension);return;}
    skyAndLandscape(c,this.assets);for(const t of this.scene.trees)this.tree(t);
    // A distant, dark rock layer keeps excavated ground visually underground.
    c.save();for(let x=0;x<32;x++)for(let y=14;y<18;y++)this.image(y<16?'dirt':'stone',x*TILE,y*TILE);
    c.fillStyle='#0009';c.fillRect(0,14*TILE,WIDTH,HEIGHT-14*TILE);c.restore();
  }
  mob(e,world){
    this.mobSprites.draw(this.ctx,e,world);
    if(e.alive&&e.skin!=='wither'&&(e.pose?.attackCharge||0)>0){
      const c=this.ctx,charge=e.pose.attackCharge,r=22+charge*30;c.save();c.translate(e.body.position.x,e.body.position.y);c.strokeStyle=e.skin==='wither'?'#cad2d3':'#76efee';c.globalAlpha=.3+charge*.6;c.lineWidth=3;
      for(let i=0;i<8;i++){const a=i*Math.PI/4+world.time*.8;c.fillStyle=c.strokeStyle;c.fillRect(Math.cos(a)*r-3,Math.sin(a)*r-3,6,6);}c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();c.restore();
    }
    if(e.alive&&e.frozen){
      const c=this.ctx,w=e.skin==='warden'?144:e.skin==='hoglin'?148:e.dimensions.width+34;
      const h=e.skin==='warden'?172:e.skin==='hoglin'?110:e.skin==='shulker'?70+e.shellAmount*26:e.dimensions.height+20;
      const x=Math.round(e.body.position.x-w/2),y=Math.round(e.body.bounds.max.y+5-h);
      c.save();c.fillStyle='#76c4ef55';c.fillRect(x,y,w,h);
      c.beginPath();c.rect(x,y,w,h);c.clip();c.globalAlpha=.35;
      for(let dy=0;dy<h;dy+=32)for(let dx=0;dx<w;dx+=32)c.drawImage(this.assets.images.ice,x+dx,y+dy,32,32);
      c.globalAlpha=1;c.strokeStyle='#d1f4ff';c.lineWidth=3;c.strokeRect(x+1.5,y+1.5,w-3,h-3);
      c.strokeStyle='#65acdf';c.lineWidth=2;c.strokeRect(x+5,y+5,w-10,h-10);
      c.fillStyle='#f1fcffb0';c.fillRect(x+8,y+8,Math.min(26,w-16),3);c.fillRect(x+8,y+8,3,18);c.restore();
    }
    if(e.alive&&e.burningUntil>world.time){
      const w=e.dimensions.width+12,h=e.dimensions.height*.8,frame=Math.floor(world.time*12+e.id)%32,c=this.ctx;
      c.save();c.globalAlpha=.85;c.drawImage(this.assets.images.fire_0,0,frame*16,16,16,e.body.position.x-w/2,e.body.bounds.max.y-h,w,h);c.restore();
    }
  }
  bossHud(world){
    const bosses=world.enemies.filter(e=>e.alive&&!e.dead&&ENCOUNTER_PROFILES[e.skin]?.boss),c=this.ctx;
    for(const [index,e] of bosses.entries()){
      const profile=ENCOUNTER_PROFILES[e.skin],x=WIDTH/2-273,y=42+index*60,filled=Math.round(182*clamp(e.hp/profile.hp,0,1));
      c.save();c.translate(x,y);c.scale(3,3);
      // Vanilla's 182-by-5 pixel silhouette, dark outline and stepped pink fill.
      c.fillStyle='#160b16';c.fillRect(0,0,182,5);c.fillStyle='#382035';c.fillRect(1,1,180,3);c.fillStyle='#68365f';c.fillRect(1,1,180,1);
      if(filled>2){c.fillStyle='#960099';c.fillRect(1,1,Math.min(180,filled-1),3);c.fillStyle='#e75be8';c.fillRect(1,1,Math.min(180,filled-1),1);c.fillStyle='#be2bc2';c.fillRect(1,2,Math.min(180,filled-1),1);}
      c.restore();c.save();c.font='bold 24px monospace';c.textAlign='center';c.fillStyle='#252025';c.fillText(profile.label,WIDTH/2+3,y-9+3);c.fillStyle='#fff';c.fillText(profile.label,WIDTH/2,y-9);c.restore();
    }
  }
  ball(x,y,ammo,size=ammo.size){
    this.image(ammo.sprite,x-size/2,y-size/2,size,size);
  }
  beam(x1,y1,x2,y2,width){
    const c=this.ctx;c.save();c.translate(x1,y1);c.rotate(Math.atan2(y2-y1,x2-x1));const length=Math.hypot(x2-x1,y2-y1);
    c.fillStyle='#38291e';c.fillRect(-2,-width/2-3,length+4,width+6);c.fillStyle=this.wood;c.fillRect(0,-width/2,length,width);c.restore();
  }
  launcher(state,world){
    const c=this.ctx,p=state.pouch,{left,right}=SLING_FRAME;
    const g=pocketGeometry(p,state.ammo.size),a=g.left,b=g.right;
    const band=(a,b,width,color)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='butt';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();};
    c.save();c.beginPath();c.rect(0,0,WIDTH,SLING_FRAME.ground);c.clip();
    if(this.slingPicture)c.drawImage(this.slingPicture,SLING_FRAME.x,SLING_FRAME.y,SLING_FRAME.width,SLING_FRAME.height);c.restore();
    // The left strap attaches to the inner face; drawing it behind the fork
    // hides that attachment and makes the visible band emerge from the outside.
    band(left,a,5,'#35271d');band(left,a,2,'#9a6b43');
    band(right,b,5,'#35271d');band(right,b,2,'#bb8a53');
    const pocketPath=()=>{const r=g.radius,h=g.belly;c.beginPath();c.moveTo(g.localLeft.x,g.localLeft.y);c.lineTo(-r*.78,h-5);c.lineTo(-r*.42,h);c.lineTo(r*.42,h);c.lineTo(r*.78,h-5);c.lineTo(g.localRight.x,g.localRight.y);c.closePath();};
    c.save();c.translate(p.x,p.y);c.rotate(g.angle);pocketPath();c.fillStyle='#765034';c.fill();c.strokeStyle='#35271d';c.lineWidth=2;c.stroke();c.restore();
    if(state.loaded)this.ball(p.x,p.y,state.ammo);
    c.save();c.translate(p.x,p.y);c.rotate(g.angle);c.beginPath();c.moveTo(-g.radius*.78,g.belly-5);c.lineTo(-g.radius*.42,g.belly);c.lineTo(g.radius*.42,g.belly);c.lineTo(g.radius*.78,g.belly-5);c.strokeStyle='#3a291e';c.lineWidth=5;c.stroke();c.strokeStyle='#bb8a55';c.lineWidth=2;c.stroke();c.restore();
    if(state.drag){
      const key=`${state.ammo.id}:${p.x.toFixed(1)}:${p.y.toFixed(1)}:${state.vx.toFixed(1)}:${state.vy.toFixed(1)}:${arcRevision(world)}`;
      if(key!==this.arcKey){this.arcKey=key;this.arc=predictArc(world,state.ammo.id,p,state.vx,state.vy);}
      c.fillStyle='#ffffffbb';for(const {x,y} of this.arc)c.fillRect(Math.round(x/3)*3,Math.round(y/3)*3,6,6);
    }
  }
  draw(world,launcher,paused=false,visualTime=world.time){
    const c=this.ctx;c.imageSmoothingEnabled=false;
    if(!this.backgroundReady){this.ctx=this.background.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;this.backdrop(0);this.ctx=c;this.backgroundReady=true;}
    c.drawImage(this.background,0,0);if(!this.scene.dimension||this.scene.dimension==='overworld')driftingClouds(c,visualTime);this.drawRear(world);this.cacheGrid(world.grid);c.drawImage(this.terrain,0,0,WIDTH,HEIGHT);
    if(world.lava?.cells.size){
      const atlas=this.assets.images.lava_still,frame=Math.floor(world.time*6)%Math.floor(atlas.height/16);
      for(const cell of world.lava.cells.values()){
       const sx=(cell.gx%4)*4,sy=frame*16+(cell.gy%4)*4;c.drawImage(atlas,sx,sy,4,4,cell.x,cell.y,cell.size,cell.size);
      }
    }
    contactShadows(c,world,SLING_HOME);
    for(const e of world.debris){if(e.dead)continue;c.save();c.translate(e.body.position.x,e.body.position.y);c.rotate(e.body.angle);c.drawImage(this.cachePiece(e),e.offset.x,e.offset.y,e.w*PIXEL,e.h*PIXEL);c.restore();}
    for(const e of world.enemies)if(!e.dead)this.mob(e,world);
    for(const fire of world.fires||[]){
      if(world.time<fire.startedAt)continue;const atlas=this.assets.images.fire_0,frame=Math.floor((world.time-fire.startedAt)*12+fire.tx*3+fire.ty)%32;
      c.save();c.globalAlpha=Math.min(1,(fire.endsAt-world.time)*2);c.drawImage(atlas,0,frame*16,16,16,fire.x,fire.y-12,fire.size,fire.size+12);c.restore();
    }
    this.launcher(launcher,world);
    for(const p of world.projectiles){if(p.dead)continue;c.save();c.translate(p.body.position.x,p.body.position.y);c.globalAlpha=projectileOpacity(p,world.time);
      c.save();if(p.ammo.id==='trident')drawTrident(c,this.assets.images.trident,p,visualTime);else if(p.ammo.id==='crystal')drawEndCrystal(c,this.assets.images.end_crystal_entity,visualTime,p);else{c.rotate(p.body.angle);this.ball(0,0,p.ammo);}if(p.ammo.id==='tnt'&&tntFlash(p.fuse)){const s=p.ammo.size;c.globalAlpha=.45;c.fillStyle='#fff';c.fillRect(-s/2,-s/2,s,s);}c.restore();
      if(p.ignited){const frame=Math.floor(world.time*12+p.id)%32;c.drawImage(this.assets.images.fire_0,0,frame*16,16,16,-20,-30,40,46);}c.restore();}
    for(const p of this.particles){c.globalAlpha=Math.min(1,p.life/(p.poof ? .15 : .8));c.fillStyle=p.color;c.fillRect(Math.round(p.x/3)*3,Math.round(p.y/3)*3,p.size,p.size);}c.globalAlpha=1;
    for(const e of this.effects){
      if(e.type==='explosion'){const frame=Math.min(15,Math.floor((1-e.life/e.total)*16)),size=e.radius*2;c.drawImage(this.assets.explosions[frame],e.x-size/2,e.y-size/2,size,size);}
      else if(e.type==='portal'){c.fillStyle='#ad65dc';c.globalAlpha=e.life/e.total;for(const p of [e,e.to])for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=20+(1-e.life/e.total)*30;c.fillRect(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,6,6);}c.globalAlpha=1;}
      else if(e.type==='encounterPulse'){
        const progress=1-e.life/e.total,r=e.radius*progress;c.save();c.strokeStyle=e.skin==='wither'?'#c4afcc':'#72eced';c.globalAlpha=(1-progress)*.8;c.lineWidth=6*(1-progress)+2;c.beginPath();c.ellipse(e.x,e.y,r,r*.72,0,0,Math.PI*2);c.stroke();c.restore();
      }
      else if(['gust','splash','snow'].includes(e.type)){
        const radius=(e.radius||45)*(1-e.life/e.total),color=e.type==='splash'?'#76b9ef':e.type==='snow'?'#eaf8ff':'#d9e8ec';c.fillStyle=color;c.globalAlpha=e.life/e.total;
        for(let i=0;i<24;i++){const a=i*Math.PI/12;c.fillRect(Math.round((e.x+Math.cos(a)*radius)/3)*3,Math.round((e.y+Math.sin(a)*radius)/3)*3,6,6);}c.globalAlpha=1;
      }
    }
    this.bossHud(world);
    if(paused){c.fillStyle='#15232da8';c.fillRect(0,0,WIDTH,HEIGHT);c.fillStyle='#fff';c.textAlign='center';c.font='bold 52px system-ui';c.fillText('已暂停',WIDTH/2,HEIGHT/2);c.textAlign='left';}
  }
}
