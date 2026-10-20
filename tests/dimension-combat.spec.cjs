const {test,expect}=require('@playwright/test');

test('Enderman retains its original purple eyes when the Bedrock skin is drawn in Canvas',async({page})=>{
 await page.goto('/');
 const purplePixels=await page.evaluate(async()=>{
  const {MobSprites}=await import('/src/mobs.mjs'),image=new Image();
  image.src='/assets/textures/enderman.png';await image.decode();
  const canvas=document.createElement('canvas');canvas.width=300;canvas.height=400;
  const c=canvas.getContext('2d');c.fillStyle='#111';c.fillRect(0,0,300,400);c.translate(150,350);c.scale(6,6);c.imageSmoothingEnabled=false;
  new MobSprites({images:{enderman:image}}).paint(c,'enderman',0,1);
  const data=c.getImageData(0,0,300,400).data;let count=0;
  for(let i=0;i<data.length;i+=4)if(data[i]>100&&data[i+2]>150&&data[i+2]>data[i+1]*1.3)count++;
  return count;
 });
 expect(purplePixels).toBeGreaterThan(20);
});
