// Minecraft block inventory convention: a textured top and two shaded sides.
export function blockIcon(front,top=front){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 const face=(image,a,b,d,shade=0)=>{
  c.save();c.transform((b[0]-a[0])/16,(b[1]-a[1])/16,(d[0]-a[0])/16,(d[1]-a[1])/16,a[0],a[1]);c.drawImage(image,0,0,16,16);
  if(shade){c.fillStyle=`rgba(0,0,0,${shade})`;c.fillRect(0,0,16,16);}c.restore();
 };
 face(front,[5,17],[32,31],[5,47],.25);face(front,[32,31],[59,17],[32,61],.10);face(top,[32,3],[59,17],[5,17]);return canvas;
}
