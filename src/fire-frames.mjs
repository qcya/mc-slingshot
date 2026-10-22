const frameCache=new WeakMap();

export function drawFireFrame(context,atlas,frame,x,y,width,height){
  const size=atlas.width,count=Math.floor(atlas.height/size),index=((Math.floor(frame)%count)+count)%count;
  let frames=frameCache.get(atlas);
  if(!frames){frames=[];frameCache.set(atlas,frames);}
  if(!frames[index]){
    const image=document.createElement('canvas');image.width=image.height=size;
    // Isolate the native pixels before scaling. Chromium can sample the previous
    // atlas frame at a fractional destination edge even with smoothing disabled.
    image.getContext('2d').drawImage(atlas,0,index*size,size,size,0,0,size,size);
    frames[index]=image;
  }
  context.drawImage(frames[index],x,y,width,height);
}
