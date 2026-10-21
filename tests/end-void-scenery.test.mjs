import test from 'node:test';
import assert from 'node:assert/strict';
import {dimensionLandscape} from '../src/scenery.mjs';

function scenery(dimension){
 const images=[],fills=[],context=()=>({createLinearGradient:()=>({addColorStop(){}}),fillRect(x,y,w,h){fills.push({x,y,w,h});},drawImage(image,x,y,w,h){images.push({name:image.name,x,y,w,h});}});
 const previous=globalThis.document;globalThis.document={createElement:()=>({getContext:context})};
 try{dimensionLandscape(context(),{images:new Proxy({},{get:(_,name)=>({name})})},dimension);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
 return {images,fills};
}

test('End scenery leaves the space below its islands as void instead of painting a false underground floor',()=>{
 const {images,fills}=scenery('end');
 assert.ok(images.some(i=>i.name==='end_stone'),'keep the distant floating islands');
 assert.ok(images.filter(i=>i.name==='end_stone').every(i=>i.y+i.h<=672),'no Endstone scenery beneath the island horizon');
 assert.ok(!fills.some(f=>f.x===0&&f.y===672&&f.w===1536),'no separate horizon floor overlay');
});

test('Nether and Sift retain their matching underground scenery',()=>{
 for(const[dimension,name]of[['nether','blackstone'],['sift','sift_siftslate']]){
  const {images,fills}=scenery(dimension);
  assert.ok(images.some(i=>i.name===name&&i.y===816));
  assert.ok(fills.some(f=>f.x===0&&f.y===672&&f.w===1536));
 }
});
