// Each renderer keeps its own material snapshot and RGBA buffer. Physics can
// consume its dirty tiles independently; a second view never misses an edit.
export function refreshPixelRaster(previous,grid,createImage,color,padding=0){
 const {width,height,cells}=grid;
 const fresh=!previous||previous.grid!==grid;
 const cache=fresh?{grid,image:createImage(width,height),cells:cells.slice()}:previous;
 let left=width,top=height,right=-1,bottom=-1;
 if(fresh){left=0;top=0;right=width-1;bottom=height-1;}
 else for(let k=0;k<cells.length;k++)if(cells[k]!==cache.cells[k]){
  cache.cells[k]=cells[k];const x=k%width,y=Math.floor(k/width);
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 if(right<left)return {cache,dirty:null};
 left=Math.max(0,left-padding);top=Math.max(0,top-padding);right=Math.min(width-1,right+padding);bottom=Math.min(height-1,bottom+padding);
 const data=cache.image.data;
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
  const k=y*width+x,offset=k*4,m=cells[k];
  if(!m){data[offset]=data[offset+1]=data[offset+2]=data[offset+3]=0;continue;}
  const p=color(m,x,y);data[offset]=p[0];data[offset+1]=p[1];data[offset+2]=p[2];data[offset+3]=p[3];
 }
 return {cache,dirty:{x:left,y:top,width:right-left+1,height:bottom-top+1}};
}
