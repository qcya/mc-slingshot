const SAVE_KEY='mc-block-launch.music.v1';
export class BackgroundMusic{
 constructor(){
  this.audio=new Audio('assets/music/sweden.ogg');this.audio.loop=true;this.audio.volume=.18;this.audio.preload='metadata';
  this.enabled=true;this.unlocked=false;this.pending=null;this.lastError='';
  try{this.enabled=localStorage.getItem(SAVE_KEY)!=='off';}catch{}
  this.audio.addEventListener('error',()=>{this.lastError='背景音乐暂时无法加载';});
  // Browsers require a real user gesture. Retry on later gestures if blocked.
  const unlock=()=>{this.unlocked=true;void this.resume();};
  document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.audio.pause();else void this.resume();});
 }
 async resume(){
  if(!this.enabled||!this.unlocked||document.hidden||!this.audio.paused||this.pending)return;
  this.pending=this.audio.play();
  try{await this.pending;this.lastError='';if(!this.enabled||document.hidden)this.audio.pause();}
  catch(error){if(error.name!=='NotAllowedError'&&error.name!=='AbortError')this.lastError=error.message;}
  finally{this.pending=null;}
 }
 setEnabled(enabled){
  this.enabled=enabled;try{localStorage.setItem(SAVE_KEY,enabled?'on':'off');}catch{}
  if(!enabled)this.audio.pause();else{this.unlocked=true;void this.resume();}
 }
 diagnostics(){return {track:'C418 — Sweden',enabled:this.enabled,playing:!this.audio.paused,loop:this.audio.loop,volume:this.audio.volume,time:this.audio.currentTime,duration:Number.isFinite(this.audio.duration)?this.audio.duration:0,lastError:this.lastError};}
}
