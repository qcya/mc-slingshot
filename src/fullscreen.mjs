export async function enterLandscape({doc=globalThis.document,display=globalThis.screen,sdk=globalThis.toy,isToy=false,onStatus=()=>{}}={}){
 onStatus('正在切换全屏横屏…');
 if(isToy&&typeof sdk?.setContainerMode==='function'){
  try{await sdk.setContainerMode({orientation:'landscape',immersive:true});onStatus('');return 'native';}catch{/* Web-hosted Toy falls back to standard browser APIs. */}
 }
 try{
  if(!doc.fullscreenElement){
   const request=doc.documentElement.requestFullscreen||doc.documentElement.webkitRequestFullscreen;
   if(!request)throw Error('Fullscreen API unavailable');await request.call(doc.documentElement);
  }
 }catch{onStatus('当前环境未允许自动全屏。可以关闭系统旋转锁，横过手机继续游玩。');return 'manual';}
 try{if(typeof display?.orientation?.lock==='function')await display.orientation.lock('landscape');else throw Error('Orientation lock unavailable');onStatus('');return 'browser';}
 catch{onStatus('已进入全屏。若仍是竖屏，请关闭系统旋转锁后横过手机。');return 'fullscreen';}
}
