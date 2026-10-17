import { MATERIALS } from './config.mjs';

export class PixelGrid {
  constructor(width,height){
    this.width=width;this.height=height;this.cells=new Uint8Array(width*height);
    this.hp=new Float32Array(width*height);this.dirty=new Set();this.version=0;
    this.recent=[];
  }
  get(x,y){x=Math.floor(x);y=Math.floor(y);return x>=0&&y>=0&&x<this.width&&y<this.height?this.cells[y*this.width+x]:0;}
  set(x,y,m){
    if(x<0||y<0||x>=this.width||y>=this.height)return;
    const k=y*this.width+x;if(this.cells[k]===m)return;
    this.cells[k]=m;this.hp[k]=m?MATERIALS[m].hard:0;
    this.dirty.add((y>>4)*Math.ceil(this.width/16)+(x>>4));this.version++;
  }
  fill(x,y,w,h,m){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)this.set(i,j,m);}
  tile(x,y,m){this.fill(x*16,y*16,16,16,m);}
  count(){let n=0;for(const m of this.cells)if(m)n++;return n;}
  damageDisk(cx,cy,radius,power,{budget=Infinity,jagged=false,seed=0,onlyMaterial=0}={}){
    let n=0;
    for(let y=Math.max(0,Math.floor(cy-radius));y<Math.min(this.height,Math.ceil(cy+radius));y++){
      for(let x=Math.max(0,Math.floor(cx-radius));x<Math.min(this.width,Math.ceil(cx+radius));x++){
        const k=y*this.width+x,m=this.cells[k];if(!m||m===7||(onlyMaterial&&m!==onlyMaterial))continue;
        const d=Math.hypot(x+.5-cx,y+.5-cy);
        const rough=jagged?.92+((x*73856093^y*19349663^seed)>>>0)%100/1250:1;
        if(d>radius*rough)continue;
        this.hp[k]-=power*(.45+.55*(1-d/radius));
        if(this.hp[k]<=0&&n<budget){this.set(x,y,0);this.recent.push({x,y,m});n++;}
      }
    }
    return n;
  }
}

// Exact rectangular decomposition, not a bounding box. Runs merge only if
// their position, width and material agree. Every surviving pixel is covered once.
export function meshPixels(mask,width,height){
  const result=[];let active=new Map();
  for(let y=0;y<height;y++){
    const next=new Map();
    for(let x=0;x<width;){
      const m=mask[y*width+x];if(!m){x++;continue;}
      const start=x;while(x<width&&mask[y*width+x]===m)x++;
      const key=`${start}:${x-start}:${m}`,previous=active.get(key);
      if(previous){previous.h++;next.set(key,previous);}
      else{const r={x:start,y,w:x-start,h:1,m};result.push(r);next.set(key,r);}
    }
    active=next;
  }
  return result;
}

export function components(mask,width,height,seen=new Uint8Array(mask.length)){
  const result=[];
  for(let start=0;start<mask.length;start++){
    if(!mask[start]||seen[start])continue;
    const queue=[start];seen[start]=1;
    for(let q=0;q<queue.length;q++){
      const k=queue[q],x=k%width,y=Math.floor(k/width);
      const visit=n=>{if(mask[n]&&!seen[n]){seen[n]=1;queue.push(n);}};
      if(x>0)visit(k-1);if(x+1<width)visit(k+1);if(y>0)visit(k-width);if(y+1<height)visit(k+width);
    }
    result.push(queue);
  }
  return result;
}

export function cropPixels(mask,width,indices){
  let x0=Infinity,y0=Infinity,x1=0,y1=0;
  for(const k of indices){const x=k%width,y=Math.floor(k/width);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  const w=x1-x0+1,h=y1-y0+1,data=new Uint8Array(w*h);
  for(const k of indices)data[(Math.floor(k/width)-y0)*w+k%width-x0]=mask[k];
  return {mask:data,w,h,x:x0,y:y0,count:indices.length};
}

export function circleClear(sample,x,y,r,step=1){
  for(let dy=-r;dy<=r;dy+=step)for(let dx=-r;dx<=r;dx+=step){
    if(dx*dx+dy*dy<=r*r&&sample(x+dx,y+dy))return false;
  }
  return true;
}

export function findSafeExit(sample,start,direction,radius,maxThickness,step=1){
  const length=Math.hypot(direction.x,direction.y);if(length<.001)return null;
  const ux=direction.x/length,uy=direction.y/length;let entry=null,last=null;
  const limit=maxThickness+radius*4+step*4;
  for(let d=0;d<=limit;d+=step){
    const x=start.x+ux*d,y=start.y+uy*d;
    if(sample(x,y)){
      entry??=d;last=d;if(d-entry+step>maxThickness)return null;
    }else if(entry!==null){
      if(d-entry-radius>maxThickness)return null;
      if(d-last>=radius+step&&circleClear(sample,x,y,radius,step))return {x,y,thickness:last-entry+step};
    }
  }
  return null;
}

export function impactDamage(speed,massA,massB=Infinity){
  if(speed<120)return 0;
  const reduced=!Number.isFinite(massA)?(Number.isFinite(massB)?massB:0):
    Number.isFinite(massB)?massA*massB/(massA+massB):massA;
  return Math.min(250,.5*reduced*(speed/100)**2*10);
}
