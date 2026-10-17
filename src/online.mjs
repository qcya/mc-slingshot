// Relative URLs also work beneath a reverse proxy prefix such as /mc-block-launch/.
// Keep the returned profile token in local storage; never put it in a URL.
export function createOnlineClient({fetchImpl=globalThis.fetch,baseUrl='',timeoutMs=8000}={}) {
  const prefix=baseUrl?`${baseUrl.replace(/\/+$/,'')}/`:'';
  async function request(route,{method='GET',token,body}={}) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const response=await fetchImpl(`${prefix}api/${route}`,{
        method,signal:controller.signal,cache:'no-store',credentials:'same-origin',
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
    profile:token=>request('profile',{token}),
    leaderboard:()=>request('leaderboard'),
    submitResult:(token,result)=>request('results',{method:'POST',token,body:result}),
  };
}
