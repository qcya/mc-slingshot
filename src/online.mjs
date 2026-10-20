// Relative URLs also work beneath a reverse proxy prefix such as /mc-block-launch/.
// Keep the returned profile token in local storage; never put it in a URL.
import {dimension,SCORE_SEASON} from './dimensions.mjs';
export function createOnlineClient({fetchImpl=globalThis.fetch,baseUrl='',timeoutMs=8000}={}) {
  const prefix=baseUrl?`${baseUrl.replace(/\/+$/,'')}/`:'';
  let worldCapabilities=null;
  async function scoped(route,world){
    const id=dimension(world).id;
    // Older servers ignore a world query. Check support before any read or
    // write, so a frontend-first update cannot mix new worlds into old scores.
    const supported=await (worldCapabilities??=request('health').then(reply=>{
      if(!Array.isArray(reply.worlds)||reply.scoreSeason!==SCORE_SEASON)throw Object.assign(Error('服务器尚未支持新赛季世界，成绩已保存在本机。'),{status:503});
      return reply.worlds;
    }).catch(error=>{worldCapabilities=null;throw error;}));
    if(!supported.includes(world))throw Object.assign(Error('服务器尚未支持这个世界，成绩已保存在本机。'),{status:503});
    return id==='overworld'?route:`${route}?world=${id}`;
  }
  async function request(route,{method='GET',token,body}={}) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const response=await fetchImpl(`${prefix}api/${route}`,{
        method,signal:controller.signal,cache:'no-store',credentials:baseUrl?'omit':'same-origin',
        headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},
        ...(body===undefined?{}:{body:JSON.stringify(body)}),
      });
      let data;try{data=await response.json();}catch{throw Object.assign(Error('Leaderboard service unavailable.'),{status:response.status});}
      if(!response.ok)throw Object.assign(Error(data.error||'Leaderboard request failed.'),{status:response.status});
      return data;
    }catch(error){if(error.name==='AbortError')throw Object.assign(Error('Leaderboard request timed out.'),{status:0});throw error;}
    finally{clearTimeout(timer);}
  }
  return {
    createProfile:nickname=>request('profile',{method:'POST',body:{nickname}}),
    updateProfile:(token,nickname)=>request('profile',{method:'PATCH',token,body:{nickname}}),
    profile:async(token,world='overworld')=>request(await scoped('profile',world),{token}),
    leaderboard:async(world='overworld')=>request(await scoped('leaderboard',world)),
    submitResult:async(token,result,world='overworld')=>request(await scoped('results',world),{method:'POST',token,body:{...result,season:SCORE_SEASON}}),
  };
}
