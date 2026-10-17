import { MATERIALS, AMMO } from './config.mjs';
const NAMES=[...new Set([...Object.values(MATERIALS).map(m=>m.sprite),...AMMO.map(a=>a.sprite).filter(Boolean),
  'oak_leaves','spruce_leaves','grass_block_side_overlay','oak_door_top','oak_door_bottom','zombie','pillager','crossbow_standby'])];
const SOUNDS=['stone','grass','dirt','glass','deepslate','wood','explode','portal','zombie_hurt','fuse'];
function image(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`缺少必需素材：${url}`));im.src=url;});}
function tint(im,color){
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');
  x.drawImage(im,0,0);x.globalCompositeOperation='multiply';x.fillStyle=color;x.fillRect(0,0,c.width,c.height);
  x.globalCompositeOperation='destination-in';x.drawImage(im,0,0);return c;
}
export class Assets {
  constructor(){this.images={};this.colors={};this.sounds={};this.soundOn=true;this.playing=0;}
  async load(){
    await Promise.all(NAMES.map(async name=>{
      const im=await image(`assets/textures/${name}.png`);
      if(!['zombie','pillager'].includes(name)&&(im.width!==16||im.height!==16))throw new Error(`纹理尺寸错误：${name}`);
      this.images[name]=im;
    }));
    this.images.oak_leaves=tint(this.images.oak_leaves,'#76a745');
    this.images.spruce_leaves=tint(this.images.spruce_leaves,'#649877');
    const grass=document.createElement('canvas');grass.width=grass.height=16;
    const gx=grass.getContext('2d');gx.drawImage(this.images.grass_block_side,0,0);
    gx.drawImage(tint(this.images.grass_block_side_overlay,'#79b44e'),0,0);this.images.grass_block_side=grass;
    for(const [name,im] of Object.entries(this.images))if(im.width===16&&im.height===16){
      const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);this.colors[name]=x.getImageData(0,0,16,16).data;
    }
    this.explosions=await Promise.all(Array.from({length:16},(_,i)=>image(`assets/effects/explosion_${i}.png`)));
    await Promise.all(SOUNDS.map(async name=>{
      const response=await fetch(`assets/sfx/${name}.ogg`);if(!response.ok)throw new Error(`缺少音效：${name}`);
      const blob=await response.blob();this.sounds[name]=new Audio(URL.createObjectURL(blob));
    }));
    return this;
  }
  play(name,volume=.3){
    if(!this.soundOn||this.playing>=8||!this.sounds[name])return;
    const a=this.sounds[name].cloneNode();a.volume=Math.min(.8,volume);this.playing++;
    let done=false;const finish=()=>{if(!done){done=true;this.playing--;}};
    a.addEventListener('ended',finish,{once:true});a.addEventListener('error',finish,{once:true});a.play().catch(finish);
  }
  pixel(m,x,y){const data=this.colors[MATERIALS[m].sprite],k=((y&15)*16+(x&15))*4;return [data[k],data[k+1],data[k+2],m===6?Math.max(28,data[k+3]):data[k+3]];}
}
