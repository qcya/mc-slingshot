export async function enterLandscape({doc=globalThis.document,display=globalThis.screen,sdk=globalThis.toy,isToy=false,onStatus=()=>{}}={}){
 onStatus('正在切换全屏横屏…');
 if(isToy&&typeof sdk?.setContainerMode==='function'){
  try{await sdk.setContainerMode({orientation:'landscape',immersive:true});onStatus('');return 'native';}catch{/* Web-hosted Toy falls back to standard browser APIs. */}
 }
 try{
  if(!doc.fullscreenElement&&!doc.webkitFullscreenElement){
   const request=doc.documentElement.requestFullscreen||doc.documentElement.webkitRequestFullscreen;
   if(!request)throw Error('Fullscreen API unavailable');await request.call(doc.documentElement);
  }
 }catch{onStatus('当前环境未允许自动全屏。可以关闭系统旋转锁，横过手机继续游玩。');return 'manual';}
 try{if(typeof display?.orientation?.lock==='function')await display.orientation.lock('landscape');else throw Error('Orientation lock unavailable');onStatus('');return 'browser';}
 catch{onStatus('已进入全屏。若仍是竖屏，请关闭系统旋转锁后横过手机。');return 'fullscreen';}
}
export async function exitLandscape({doc=globalThis.document,display=globalThis.screen,sdk=globalThis.toy,isNative=false,onStatus=()=>{}}={}){
 try{
  if(isNative){await sdk.setContainerMode({orientation:'landscape',immersive:false});onStatus('');return 'native';}
  if(doc.fullscreenElement||doc.webkitFullscreenElement){const exit=doc.exitFullscreen||doc.webkitExitFullscreen;if(!exit)throw Error('Fullscreen exit unavailable');await exit.call(doc);}
  try{display?.orientation?.unlock?.();}catch{}
  onStatus('');return 'browser';
 }catch{onStatus('暂时无法取消全屏，请重试或使用系统返回键。');return 'failed';}
}
