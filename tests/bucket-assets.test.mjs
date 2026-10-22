import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url);
test('native bucket images and pour sound retain their documented upstream bytes',async()=>{
  const manifest=JSON.parse(await readFile(new URL('docs/bucket-assets.json',root),'utf8'));
  for(const asset of manifest.assets){
    const bytes=await readFile(new URL(asset.file,root));
    assert.equal(bytes.length,asset.bytes,`${asset.file}: original byte count`);
    assert.equal(createHash('sha1').update(bytes).digest('hex'),asset.sha1,`${asset.file}: original SHA-1`);
    if(asset.width){
      assert.equal(bytes.subarray(1,4).toString(),'PNG');
      assert.equal(bytes.readUInt32BE(16),16);
      assert.equal(bytes.readUInt32BE(20),16);
    }else assert.equal(bytes.subarray(0,4).toString(),'OggS');
  }
});
