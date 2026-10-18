// The original Minecraft crossbow loading sample, never synthesized noise.
export class DrawAudio{
 constructor(){this.context=null;this.active=false;this.muted=false;this.volume=1;this.level=.12;this.starts=0;this.stops=0;this.lastMove=0;}
 async load(url){const response=await fetch(url);this.data=await response.arrayBuffer();return this;}
 begin(){
  if(this.muted||this.active)return;this.context??=new AudioContext();const c=this.context;c.resume().catch(()=>{});
  this.active=true;this.starts++;this.lastMove=performance.now();
  const gain=c.createGain(),analyser=c.createAnalyser();this.level=.12;gain.gain.value=this.level*this.volume;analyser.fftSize=256;gain.connect(analyser);analyser.connect(c.destination);
  const graph={gain,analyser,source:null};this.graph=graph;
  this.ready??=c.decodeAudioData(this.data.slice(0));this.ready.then(buffer=>{
   if(!this.active||this.graph!==graph)return;const source=c.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);graph.source=source;source.start();
  }).catch(()=>{this.failed=true;this.stop();});
 }
 update(power,speed){
  if(this.muted)return;if(!this.active)this.begin();if(!this.graph)return;this.lastMove=performance.now();
  this.level=.10+.10*Math.min(1,speed/12);this.graph.gain.gain.setTargetAtTime(this.level*this.volume,this.context.currentTime,.025);
  if(this.graph.source)this.graph.source.playbackRate.setTargetAtTime(.9+power*.18,this.context.currentTime,.06);
 }
 tick(){if(this.active&&performance.now()-this.lastMove>160)this.graph.gain.gain.setTargetAtTime(0,this.context.currentTime,.05);}
 stop(){
  if(!this.active)return;const g=this.graph,c=this.context;this.active=false;this.stops++;this.graph=null;
  g.gain.gain.setTargetAtTime(0,c.currentTime,.012);
  if(g.source){g.source.stop(c.currentTime+.05);g.source.onended=()=>{g.source.disconnect();g.gain.disconnect();g.analyser.disconnect();};}
  else{g.gain.disconnect();g.analyser.disconnect();}
 }
 setMuted(value){this.muted=value;if(value)this.stop();}
 setVolume(value){if(!Number.isFinite(value))return;this.volume=Math.max(0,Math.min(1,value));if(this.graph)this.graph.gain.gain.setTargetAtTime((performance.now()-this.lastMove>160?0:this.level)*this.volume,this.context.currentTime,.025);}
 diagnostics(){
  let rms=0;if(this.graph){const values=new Float32Array(256);this.graph.analyser.getFloatTimeDomainData(values);rms=Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length);}
  return {active:this.active,starts:this.starts,stops:this.stops,state:this.context?.state||'unused',signalRms:rms,source:'minecraft:crossbow_loading',failed:!!this.failed};
 }
}
