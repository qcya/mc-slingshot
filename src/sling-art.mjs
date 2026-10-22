// A small, opaque-pixel wooden fork. It shares the world's 3px pixel scale.
export function makeSlingArt(wood){
 const canvas=document.createElement('canvas');canvas.width=46;canvas.height=58;
 const c=canvas.getContext('2d'),im=c.createImageData(46,58);
 const outline=[[17,58],[29,58],[28,37],[38,22],[42,4],[34,1],[29,18],[23,27],[17,18],[12,1],[4,4],[8,23],[18,38]];
 const inside=(x,y)=>{let hit=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){
  const [a,b]=outline[i],[d,e]=outline[j];if((b>y)!==(e>y)&&x<(d-a)*(y-b)/(e-b)+a)hit=!hit;
 }return hit;};
 for(let y=0;y<58;y++)for(let x=0;x<46;x++){
  if(!inside(x+.5,y+.5))continue;
  const edge=!inside(x-.5,y+.5)||!inside(x+1.5,y+.5)||!inside(x+.5,y-.5)||!inside(x+.5,y+1.5);
  const sample=((y&15)*16+((x+7)&15))*4,shade=edge?.40:x<23?1.05:.78;
  im.data.set(wood?[wood[sample]*shade,wood[sample+1]*shade,wood[sample+2]*shade,255]:[110*shade,77*shade,42*shade,255],(y*46+x)*4);
 }
 c.putImageData(im,0,0);
 for(const [x,y]of [[6,4],[32,4]]){
  c.fillStyle='#2f241d';c.fillRect(x,y,8,6);c.fillStyle='#836647';c.fillRect(x+1,y+1,6,4);
  c.fillStyle='#c09c6a';c.fillRect(x+1,y+1,6,1);c.fillStyle='#493728';c.fillRect(x+1,y+4,6,1);
 }
 return canvas;
}
