// Quiet elastic creak driven by the pull gesture, stopped on release/cancel/blur.
export class DrawAudio{
 constructor(){this.context=null;this.active=false;this.muted=false;this.starts=0;this.stops=0;this.lastMove=0;}
 begin(){
  if(this.muted||this.active)return;
  this.context??=new AudioContext();const c=this.context;c.resume().catch(()=>{});
  const buffer=c.createBuffer(1,c.sampleRate,c.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.65;
  const noise=c.createBufferSource();noise.buffer=buffer;noise.loop=true;
  const filter=c.createBiquadFilter();filter.type='bandpass';filter.frequency.value=550;filter.Q.value=1.4;
  const gain=c.createGain();gain.gain.value=0;const tone=c.createOscillator(),toneGain=c.createGain();tone.type='triangle';tone.frequency.value=90;toneGain.gain.value=.2;
  const analyser=c.createAnalyser();analyser.fftSize=256;
  noise.connect(filter);filter.connect(gain);tone.connect(toneGain);toneGain.connect(gain);gain.connect(analyser);analyser.connect(c.destination);
  noise.start();tone.start();this.graph={noise,filter,gain,tone,toneGain,analyser};this.active=true;this.starts++;this.lastMove=performance.now();
 }
 update(power,speed){
  if(this.muted)return;if(!this.active)this.begin();if(!this.graph)return;
  const c=this.context,g=this.graph;this.lastMove=performance.now();
  g.filter.frequency.setTargetAtTime(360+power*1050,c.currentTime,.035);g.tone.frequency.setTargetAtTime(75+power*105,c.currentTime,.06);
  g.gain.gain.setTargetAtTime((.025+.065*Math.min(1,speed/10))*Math.sqrt(Math.max(.01,power)),c.currentTime,.025);
 }
 tick(){if(this.active&&performance.now()-this.lastMove>130)this.graph.gain.gain.setTargetAtTime(0,this.context.currentTime,.06);}
 stop(){
  if(!this.active)return;const g=this.graph,c=this.context;this.active=false;this.stops++;this.graph=null;
  g.gain.gain.setTargetAtTime(0,c.currentTime,.012);g.noise.stop(c.currentTime+.05);g.tone.stop(c.currentTime+.05);
  g.noise.onended=()=>{for(const node of Object.values(g))node.disconnect();};
 }
 setMuted(value){this.muted=value;if(value)this.stop();}
 diagnostics(){
  let rms=0;if(this.graph){const values=new Float32Array(256);this.graph.analyser.getFloatTimeDomainData(values);rms=Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length);}
  return {active:this.active,starts:this.starts,stops:this.stops,state:this.context?.state||'unused',signalRms:rms};
 }
}
