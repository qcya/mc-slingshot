import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import * as modes from '../src/playtest.mjs';
const {buildToy}=createRequire(import.meta.url)('../scripts/build-toy.cjs');

test('release review disables the SDK without enabling free-play or hiding the release profile',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mc-release-profile-'));
 try{
  const built=buildToy({output:path.join(temp,'site'),review:true}),html=fs.readFileSync(path.join(built.output,'index.html'),'utf8'),config=fs.readFileSync(path.join(built.output,'toy-config.js'),'utf8');
  assert.doesNotMatch(html,/src="vendor\/toy-sdk\.min\.js"/);
  assert.match(config,/"toy":false/);assert.equal(built.ranking,'offline release review');
  assert.throws(()=>buildToy({output:path.join(temp,'invalid'),playtest:true,review:true}),/mutually exclusive/);
 }finally{assert.ok(temp.startsWith(path.join(os.tmpdir(),'mc-release-profile-')));fs.rmSync(temp,{recursive:true,force:true});}
});

test('release review stores real progress persistently without reading or changing formal save keys',()=>{
 assert.equal(typeof modes.reviewStorage,'function');
 const saved=new Map([['mc-block-launch.best-times.v2','[7317]']]),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,String(v))};
 const review=modes.reviewStorage(storage);
 assert.equal(review.getItem('mc-block-launch.best-times.v2'),null);
 review.setItem('mc-block-launch.best-times.v2','[1234]');
 assert.equal(modes.reviewStorage(storage).getItem('mc-block-launch.best-times.v2'),'[1234]');
 assert.equal(storage.getItem('mc-block-launch.best-times.v2'),'[7317]');
 assert.equal(modes.PLAYTEST,false);assert.equal(modes.REVIEW,false);
});
