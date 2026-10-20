// The vanilla anvil is a block model, so its inventory sprite is assembled
// from the original block textures instead of inventing an item texture.
export function makeAnvilIcon(base,top){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 const point=(x,y,z)=>[32+(x-z-3)*1.7,56+(x+z-13)*.7-y*2.1];
 const face=(image,a,b,d,shade)=>{c.save();c.transform((b[0]-a[0])/16,(b[1]-a[1])/16,(d[0]-a[0])/16,(d[1]-a[1])/16,...a);c.drawImage(image,0,0,16,16);if(shade){c.fillStyle=`rgba(0,0,0,${shade})`;c.fillRect(0,0,16,16);}c.restore();};
 const box=(x,y,z,w,h,d)=>{face(base,point(x,y+h,z+d),point(x+w,y+h,z+d),point(x,y,z+d),.25);face(base,point(x+w,y+h,z+d),point(x+w,y+h,z),point(x+w,y,z+d),.4);face(top,point(x,y+h,z),point(x+w,y+h,z),point(x,y+h,z+d),.03);};
 box(0,0,0,16,4,10);box(4,4,1,8,6,8);box(0,10,0,16,6,10);return canvas;
}
