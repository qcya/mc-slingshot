import test from'node:test';import assert from'node:assert/strict';import{Assets}from'../src/assets.mjs';import{DrawAudio}from'../src/draw-audio.mjs';
test('sound preferences scale existing clips as well as new playback and survive a fresh assets instance',async()=>{
 const prior=globalThis.localStorage,store=new Map();globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 try{let clip;const a=new Assets();a.sounds.glass={cloneNode:()=>clip={volume:1,addEventListener(){},play:async()=>{}}};a.setSoundVolume(.5);a.play('glass',.8);assert.equal(clip.volume,.4);a.setSoundEnabled(false);assert.equal(clip.volume,0);a.setSoundVolume(.75);a.setSoundEnabled(true);assert.equal(clip.volume,.8*.75);const fresh=new Assets();assert.equal(fresh.soundVolume,.75);assert.equal(fresh.soundOn,true);await Promise.resolve();}finally{if(prior===undefined)delete globalThis.localStorage;else globalThis.localStorage=prior;}
});
test('the crossbow draw gain uses the same effect volume multiplier',()=>{
 const prior=globalThis.AudioContext;let value;globalThis.AudioContext=class{currentTime=0;destination={};resume(){return Promise.resolve()}createGain(){return{gain:{set value(v){value=v},setTargetAtTime(v){value=v}},connect(){},disconnect(){}}}createAnalyser(){return{connect(){},disconnect(){}}}decodeAudioData(){return new Promise(()=>{})}};
 try{const d=new DrawAudio();d.data=new ArrayBuffer(2);d.setVolume(.25);d.begin();assert.equal(value,.03);d.update(.7,12);assert.equal(value,.05);d.setVolume(0);assert.equal(value,0);d.stop();}finally{if(prior===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=prior;}
});
