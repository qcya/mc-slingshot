import { MATERIALS, AMMO } from './config.mjs';
import {blockIcon} from './item-icons.mjs';
import {makeAnvilIcon} from './combat-render.mjs';
const ATLASES=['zombie','pillager','warden','fire_0','zombified_piglin','hoglin','shulker','enderman','lava_still','lava_flow','crimson_stem','warped_stem','wither','ender_dragon','sift_blub','sift_sifter','sift_singer','sift_echo_golem','end_crystal_entity'];
const NAMES=[...new Set([...Object.values(MATERIALS).map(m=>m.sprite).filter(n=>n!=='ladder_wall'),...AMMO.map(a=>a.sprite).filter(n=>n&&n!=='anvil'),'ladder','tnt_top',
  'oak_leaves','spruce_leaves','cherry_log','cherry_leaves','grass_block_side_overlay','oak_door_top','oak_door_bottom',...ATLASES,'anvil_base','anvil_top','crossbow_standby','ice','snowball','splash_water','sift_healthy_sculk'])];
const SOUNDS=['stone','grass','dirt','glass','deepslate','wood','explode','portal','zombie_hurt','pillager_hurt','fuse','bow','crossbow_pull','zombie_idle','pillager_idle','fire_launch','fire_burn','warden_hurt','warden_idle',
 'zombified_piglin_hurt','zombified_piglin_idle','hoglin_hurt','hoglin_idle','shulker_hurt','shulker_idle','shulker_open','shulker_close','enderman_hurt','enderman_idle','wind_burst','water_splash','anvil_land',
 'zombie_death','pillager_death','zombified_piglin_death','hoglin_death','warden_death','shulker_death','enderman_death','wither_hurt','wither_death','wither_idle','ender_dragon_hurt','ender_dragon_death','ender_dragon_idle','sift_singer_hurt','sift_singer_death','sift_singer_idle','trident_return','sift_blub_hurt','sift_blub_death','sift_blub_idle','sift_sifter_hurt','sift_sifter_death','sift_sifter_idle','sift_echo_golem_hurt','sift_echo_golem_death'];
// Toy may serve PNG files from a separate CDN. Embed the canvas sources in the
// build so pixel sampling, skin conversion and inventory data URLs stay readable.
const PACKAGED_IMAGES=typeof __MC_CANVAS_IMAGES__==='undefined'?null:__MC_CANVAS_IMAGES__;
const PACKAGED_SOUNDS=typeof __MC_SOUND_SOURCES__==='undefined'?null:__MC_SOUND_SOURCES__;
function image(url){return new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`素材无法加载或跨域访问未获许可：${url}`));im.src=PACKAGED_IMAGES?.[url]??url;});}
function tint(im,color){
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');
  x.drawImage(im,0,0);x.globalCompositeOperation='multiply';x.fillStyle=color;x.fillRect(0,0,c.width,c.height);
  x.globalCompositeOperation='destination-in';x.drawImage(im,0,0);return c;
}
export class Assets {
  constructor(){this.images={};this.colors={};this.averages={};this.sounds={};this.soundOn=true;this.soundVolume=1;this.soundsPaused=false;this.activeSounds=new Map();this.playing=0;this.audioStats={played:{},failed:0,lastError:null};try{const saved=JSON.parse(localStorage.getItem('mc-block-launch.audio.v1'));if(typeof saved?.enabled==='boolean')this.soundOn=saved.enabled;if(Number.isFinite(saved?.volume))this.soundVolume=Math.max(0,Math.min(1,saved.volume));}catch{}}
  saveAudio(){try{localStorage.setItem('mc-block-launch.audio.v1',JSON.stringify({enabled:this.soundOn,volume:this.soundVolume}));}catch{}for(const[a,clip]of this.activeSounds)a.volume=this.soundOn?clip.base*this.soundVolume:0;}
  setSoundEnabled(enabled){this.soundOn=!!enabled;this.saveAudio();}
  setSoundVolume(volume){if(!Number.isFinite(volume))return;this.soundVolume=Math.max(0,Math.min(1,volume));this.saveAudio();}
  pauseAll(){
    if(this.soundsPaused)return;this.soundsPaused=true;
    for(const[a,clip]of this.activeSounds){clip.version++;a.pause();}
  }
  resumeAll(){
    if(!this.soundsPaused)return;this.soundsPaused=false;
    for(const clip of this.activeSounds.values())clip.start();
  }
  stopAll(){for(const[a,clip]of this.activeSounds){clip.finish();a.pause();}}
  async load(){
    await Promise.all(NAMES.map(async name=>{
      const im=await image(`assets/textures/${name}.png`);
      if(!ATLASES.includes(name)&&(im.width!==16||im.height!==16))throw new Error(`纹理尺寸错误：${name}`);
      this.images[name]=im;
    }));
    // Animated stems use their first original 16px frame for the terrain cache.
    for(const name of ['crimson_stem','warped_stem']){const c=document.createElement('canvas');c.width=c.height=16;c.getContext('2d').drawImage(this.images[name],0,0,16,16,0,0,16,16);this.images[name]=c;}
    this.images.anvil=makeAnvilIcon(this.images.anvil_base,this.images.anvil_top);
    this.images.oak_leaves=tint(this.images.oak_leaves,'#76a745');
    this.images.spruce_leaves=tint(this.images.spruce_leaves,'#649877');
    const grass=document.createElement('canvas');grass.width=grass.height=16;
    const gx=grass.getContext('2d');gx.drawImage(this.images.grass_block_side,0,0);
    gx.drawImage(tint(this.images.grass_block_side_overlay,'#79b44e'),0,0);this.images.grass_block_side=grass;
    const ladder=document.createElement('canvas');ladder.width=ladder.height=16;const lc=ladder.getContext('2d');lc.drawImage(this.images.oak_planks,0,0);lc.drawImage(this.images.ladder,0,0);this.images.ladder_wall=ladder;
    this.icons=Object.fromEntries(AMMO.map(a=>[a.id,this.images[a.sprite]]));
    this.icons.cobble=blockIcon(this.images.cobblestone);this.icons.tnt=blockIcon(this.images.tnt_side,this.images.tnt_top);
    for(const [name,im] of Object.entries(this.images))if(im.width===16&&im.height===16){
      const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);this.colors[name]=x.getImageData(0,0,16,16).data;
      const sums=[0,0,0];for(let i=0;i<1024;i+=4)for(let channel=0;channel<3;channel++)sums[channel]+=this.colors[name][i+channel];this.averages[name]=sums.map(v=>v/256);
    }
    this.explosions=await Promise.all(Array.from({length:16},(_,i)=>image(`assets/effects/explosion_${i}.png`)));
    await Promise.all(SOUNDS.map(async name=>{
      const path=`assets/sfx/${name}.ogg`,response=await fetch(PACKAGED_SOUNDS?.[path]??path);if(!response.ok)throw new Error(`缺少音效：${name}`);
      const blob=await response.blob();this.sounds[name]=new Audio(URL.createObjectURL(blob));
    }));
    // The Sift's copper-golem events postdate the cached vanilla audio index.
    // Keep the documented native Warden ambience fallback for this adaptation.
    this.sounds.sift_echo_golem_idle=this.sounds.warden_idle;
    return this;
  }
  play(name,volume=.3){
    if(this.soundsPaused||!this.soundOn||this.playing>=8||!this.sounds[name])return;
    const a=this.sounds[name].cloneNode(),clip={base:Math.min(.8,volume),done:false,started:false,version:0};
    a.volume=clip.base*this.soundVolume;this.activeSounds.set(a,clip);this.playing++;
    const finish=clip.finish=()=>{
      if(clip.done)return;clip.done=true;this.playing--;this.activeSounds.delete(a);
      a.removeEventListener('ended',finish);a.removeEventListener('error',finish);
    };
    // Pausing invalidates pending play callbacks; resuming owns a new attempt.
    clip.start=()=>{
      const version=++clip.version;
      a.play().then(()=>{
        if(clip.done||this.soundsPaused){a.pause();return;}if(version!==clip.version)return;
        if(!clip.started){clip.started=true;this.audioStats.played[name]=(this.audioStats.played[name]||0)+1;}
      }).catch(error=>{
        if(clip.done||version!==clip.version)return;
        this.audioStats.failed++;this.audioStats.lastError=error.message;finish();
      });
    };
    a.addEventListener('ended',finish,{once:true});a.addEventListener('error',finish,{once:true});clip.start();
  }
  pixel(m,x,y){const data=this.colors[MATERIALS[m].sprite],k=((y&15)*16+(x&15))*4;return [data[k],data[k+1],data[k+2],m===6?Math.max(28,data[k+3]):data[k+3]];}
}
