import test from 'node:test';
import assert from 'node:assert/strict';
import {Assets} from '../src/assets.mjs';

// Media play promises are controlled here to exercise browser pause/play races.
function audioPool({pending=false}={}){
 const assets=new Assets(),clips=[];
 assets.sounds.fuse={cloneNode(){
  const clip=new EventTarget();Object.assign(clip,{volume:1,currentTime:0,paused:true,attempts:[],pause(){this.paused=true;},play(){
   this.paused=false;if(!pending)return Promise.resolve();
   return new Promise((resolve,reject)=>this.attempts.push({resolve:()=>{this.paused=false;resolve();},reject}));
  }});clips.push(clip);return clip;
 }};
 return {assets,clips};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};

test('pause retains the clip position and current volume preferences when resumed',async()=>{
 const {assets:a,clips}=audioPool();a.play('fuse',.4);await settle();const clip=clips[0];clip.currentTime=.75;
 a.pauseAll();a.pauseAll();assert.equal(clip.paused,true);assert.equal(a.playing,1);
 a.setSoundVolume(0);a.resumeAll();await settle();assert.equal(clip.paused,false);assert.equal(clip.currentTime,.75);assert.equal(clip.volume,0);
 a.pauseAll();a.setSoundVolume(.5);a.setSoundEnabled(false);a.resumeAll();await settle();assert.equal(clip.volume,0);assert.equal(clip.paused,false);
 a.setSoundEnabled(true);assert.equal(clip.volume,.2);assert.equal(a.audioStats.played.fuse,1);
 clip.dispatchEvent(new Event('ended'));assert.equal(a.playing,0);assert.equal(a.activeSounds.size,0);
});

test('new effects cannot start while the gameplay audio pool is paused',()=>{
 const {assets:a,clips}=audioPool();a.pauseAll();a.play('fuse');assert.equal(clips.length,0);assert.equal(a.playing,0);
 a.resumeAll();a.play('fuse');assert.equal(clips.length,1);assert.equal(a.playing,1);
});

test('a play promise resolving after pause cannot restart a paused effect',async()=>{
 const {assets:a,clips}=audioPool({pending:true});a.play('fuse');const clip=clips[0];clip.currentTime=.4;
 a.pauseAll();clip.attempts[0].resolve();await settle();assert.equal(clip.paused,true);assert.equal(a.playing,1);assert.equal(a.audioStats.failed,0);
 a.resumeAll();clip.attempts[1].resolve();await settle();assert.equal(clip.paused,false);assert.equal(clip.currentTime,.4);assert.equal(a.audioStats.played.fuse,1);
});

test('a pause-aborted play cannot release the resumed clip or count as a failure',async()=>{
 const {assets:a,clips}=audioPool({pending:true});a.play('fuse');const clip=clips[0];
 a.pauseAll();a.resumeAll();clip.attempts[0].reject(Object.assign(new Error('play interrupted by pause'),{name:'AbortError'}));clip.attempts[1].resolve();await settle();
 assert.equal(clip.paused,false);assert.equal(a.playing,1);assert.equal(a.activeSounds.size,1);assert.equal(a.audioStats.failed,0);assert.equal(a.audioStats.played.fuse,1);
});

test('stop releases every pool slot once, including effects with unsettled play promises',async()=>{
 const {assets:a,clips}=audioPool({pending:true});for(let i=0;i<8;i++)a.play('fuse');assert.equal(a.playing,8);
 a.stopAll();a.stopAll();assert.equal(a.playing,0);assert.equal(a.activeSounds.size,0);assert.ok(clips.every(c=>c.paused));
 for(const clip of clips){clip.attempts[0].resolve();clip.dispatchEvent(new Event('ended'));clip.dispatchEvent(new Event('error'));}await settle();
 assert.ok(clips.every(c=>c.paused));assert.equal(a.playing,0);assert.equal(a.audioStats.failed,0);assert.equal(a.audioStats.played.fuse,undefined);
 a.pauseAll();a.resumeAll();for(let i=0;i<8;i++)a.play('fuse');assert.equal(a.playing,8);assert.equal(clips.length,16);
});
