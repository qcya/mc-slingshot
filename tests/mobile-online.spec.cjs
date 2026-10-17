const {test,expect}=require('@playwright/test');

test('网络不可用仍能保存昵称，重连后取得在线身份且不会卡在开局',async({page})=>{
 await page.route('**/api/profile',r=>r.abort());await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);
 await page.locator('#nickname').fill('离线玩家');await page.locator('#saveProfile').click();await expect(page.locator('#levelMenu')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mc-block-launch.profile.v1')).nickname)).toBe('离线玩家');
 await page.unroute('**/api/profile');await page.reload();await page.waitForFunction(()=>window.MCBlockLaunch);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mc-block-launch.profile.v1')).token)).toBeTruthy();await expect(page.locator('#profileBtn')).toHaveText('玩家：离线玩家');
});

test('开局昵称、共享排行榜和改名能实际往返服务器',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);
 await expect(page.locator('#profileMenu')).toBeVisible();await page.locator('#nickname').fill('在线测试玩家');await page.locator('#saveProfile').click();
 await expect(page.locator('#levelMenu')).toBeVisible();const p=await page.evaluate(()=>JSON.parse(localStorage.getItem('mc-block-launch.profile.v1')));expect(p.token).toBeTruthy();
 let reads=0;page.on('request',r=>{if(r.url().endsWith('/api/leaderboard'))reads++;});
 await page.locator('#leaderboardBtn').click();await expect.poll(()=>reads).toBe(1);await expect(page.locator('#rankingTable')).toBeVisible();await expect(page.locator('#leaderboardStatus')).not.toHaveText('全通关后展示');await expect(page.locator('#rankingRows tr.self')).toHaveCount(0);
 const partial=await page.request.post('/api/results',{headers:{Authorization:`Bearer ${p.token}`},data:{stages:[{stage:0,timeMs:4500}]}});expect(partial.status()).toBe(400);
 const submit=await page.request.post('/api/results',{headers:{Authorization:`Bearer ${p.token}`},data:{stages:Array.from({length:10},(_,stage)=>({stage,timeMs:4500}))}});expect(submit.ok()).toBe(true);
 await page.reload();await page.waitForFunction(()=>window.MCBlockLaunch);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mc-block-launch.best-times.v1'))?.filter(Number.isInteger).length)).toBe(10);
 await page.locator('#leaderboardBtn').click();await expect(page.locator('#rankingRows tr.self')).toContainText('在线测试玩家');await expect(page.locator('#rankingRows tr.self')).toContainText('00:45.000');
 await page.locator('#leaderboardBack').click();await page.locator('#profileBtn').click();await page.locator('#nickname').fill('改名玩家');await page.locator('#saveProfile').click();
 await page.locator('#leaderboardBtn').click();await expect(page.locator('#rankingRows tr.self')).toContainText('改名玩家');expect(errors).toEqual([]);
});

test('leaving nickname editing retries a discarded delayed full-record restore',async({page})=>{
 const created=await page.request.post('/api/profile',{data:{nickname:'RestoreTester'}}),identity=await created.json();
 await page.addInitScript(p=>localStorage.setItem('mc-block-launch.profile.v1',JSON.stringify({...p.profile,token:p.token})),identity);
 let release,reads=0;await page.route('**/api/profile',async route=>{
  if(route.request().method()!=='GET')return route.continue();reads++;if(reads===1)await new Promise(r=>release=r);
  await route.fulfill({json:{profile:identity.profile,stages:Array.from({length:10},(_,stage)=>({stage,timeMs:3000}))}});
 });
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await expect.poll(()=>reads).toBe(1);await page.locator('#profileBtn').click();
 const response=page.waitForResponse(r=>r.url().endsWith('/api/profile')&&r.request().method()==='GET');release();await response;await page.waitForTimeout(50);
 await page.locator('#profileBack').click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mc-block-launch.best-times.v1'))?.filter(Number.isInteger).length)).toBe(10);
 expect(reads).toBeGreaterThanOrEqual(2);
});

test('a new player can view a board capped at one hundred people',async({page})=>{
 await page.route('**/api/leaderboard',r=>r.fulfill({json:{entries:Array.from({length:105},(_,i)=>({id:`other${i}`,rank:i+1,nickname:`Player${i+1}`,completed:10,totalTimeMs:10000+i}))}}));
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#nickname').fill('NewViewer');await page.locator('#saveProfile').click();await page.locator('#leaderboardBtn').click();
 await expect(page.locator('#rankingRows tr')).toHaveCount(100);await expect(page.locator('#rankingRows tr').last()).toContainText('Player100');await expect(page.locator('#rankingRows tr.self')).toHaveCount(0);await page.screenshot({path:'evidence/leaderboard-public-top100.png'});
});

test('overlapping board refreshes cannot append duplicate rows or replace newer results',async({page})=>{
 let reads=0,release;await page.route('**/api/leaderboard',async r=>{
  const first=++reads===1;if(first)await new Promise(resolve=>release=resolve);
  await r.fulfill({json:{entries:Array.from({length:100},(_,i)=>({id:`p${i}`,rank:i+1,nickname:`${first?'Old':'Latest'}${i}`,completed:10,totalTimeMs:10000+i}))}});
 });
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#nickname').fill('RefreshTester');await page.locator('#saveProfile').click();await page.locator('#leaderboardBtn').click();await expect.poll(()=>reads).toBe(1);
 await page.locator('#leaderboardRefresh').click();await expect(page.locator('#rankingRows tr')).toHaveCount(100);await expect(page.locator('#rankingRows tr').first()).toContainText('Latest0');
 const response=page.waitForResponse(r=>r.url().endsWith('/api/leaderboard'));release();await response;await page.waitForTimeout(50);
 await expect(page.locator('#rankingRows tr')).toHaveCount(100);await expect(page.locator('#rankingRows tr').first()).toContainText('Latest0');
});

test('an occupied nickname stays in the form with a clear message',async({page})=>{
 const occupied=`Taken${Date.now().toString(36)}`;expect((await page.request.post('/api/profile',{data:{nickname:occupied}})).ok()).toBe(true);
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await expect(page).toHaveTitle('MC打弹弓 · MC Slingshot');await expect(page.locator('#levelMenu h1')).toHaveText('MC打弹弓');await page.locator('#nickname').fill(occupied);await page.locator('#saveProfile').click();
 await expect(page.locator('#profileMenu')).toBeVisible();await expect(page.locator('#profileStatus')).toHaveText('用户名已占用');await expect(page.locator('#saveProfile')).toBeEnabled();
 expect(await page.evaluate(()=>localStorage.getItem('mc-block-launch.profile.v1'))).toBeNull();
 await page.locator('#nickname').fill(`${occupied}a`);await page.locator('#saveProfile').click();await expect(page.locator('#levelMenu')).toBeVisible();
 await page.locator('#leaderboardBtn').click();
 expect(await page.locator('#leaderboardMenu').evaluate(e=>getComputedStyle(e).backgroundImage)).toBe(await page.locator('#levelMenu').evaluate(e=>getComputedStyle(e).backgroundImage));
 await page.screenshot({path:'evidence/leaderboard-menu-background.png'});
});

test('the sample score is visibly labelled as a test record',async({page})=>{
 await page.route('**/api/leaderboard',r=>r.fulfill({json:{entries:[{id:'sample',rank:1,nickname:'星海',completed:10,totalTimeMs:397000,demo:true}]}}));
 await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#nickname').fill('SampleViewer');await page.locator('#saveProfile').click();await page.locator('#leaderboardBtn').click();
 await expect(page.locator('#rankingRows tr')).toContainText('星海');await expect(page.locator('.demo-badge')).toHaveText('测试');await expect(page.locator('#rankingRows tr')).toContainText('06:37.000');await page.screenshot({path:'evidence/demo-leaderboard-preview.png'});
});

test.describe('Android 触屏布局与实际输入',()=>{
 test.use({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 test('one pause control, five-point aim, anywhere second-finger cancel and direct hotbar access',async({page,context})=>{
  await page.addInitScript(()=>localStorage.setItem('mc-block-launch.campaign.v1',JSON.stringify({unlocked:10,completed:[]})));
  await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#nickname').fill('MobileTester');await page.locator('#saveProfile').tap();await page.locator('#level-2').tap();
  await expect(page.locator('.touch-controls button')).toHaveCount(1);await expect(page.locator('#touchPause')).toHaveText('\u6682\u505c\u83dc\u5355');
  const box=await page.locator('#stage').boundingBox(),p=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher),pause=await page.locator('#touchPause').boundingBox(),hint=await page.locator('#gamehint').boundingBox();
  expect(pause.x).toBeLessThan(box.x+box.width/3);expect(hint.y+hint.height).toBeLessThan(box.y+box.height/3);
  const cdp=await context.newCDPSession(page),point={x:box.x+p.x*box.width/1536,y:box.y+p.y*box.height/864};
  for(const second of [{x:box.x+box.width*.8,y:box.y+box.height*.3},{x:pause.x+pause.width/2,y:pause.y+pause.height/2}]){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-38,y:point.y+18,id:1}]});
   await expect.poll(()=>page.evaluate(()=>MCBlockLaunch.getDiagnostics().preview.length)).toBe(5);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x-38,y:point.y+18,id:1},{...second,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   expect(await page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(0);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().screen)).toBe('play');
  }
  await page.waitForTimeout(3600);await expect(page.locator('#inventory')).not.toHaveClass(/tucked/);await page.locator('#ballbar button').nth(1).tap();expect(await page.evaluate(()=>MCBlockLaunch.getStatus().selected)).toBe('tnt');
  await page.locator('#touchPause').tap();const time=await page.evaluate(()=>MCBlockLaunch.getStatus().time);await page.waitForTimeout(200);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().time)).toBe(time);
  await page.locator('#resume').tap();await page.screenshot({path:'evidence/android-landscape.png'});
  await page.setViewportSize({width:390,height:844});await expect(page.locator('#rotateHint')).toBeVisible();await page.locator('#touchPause').tap();await page.locator('#levelMenuBtn').tap();
  await expect(page.locator('#level-9')).toBeVisible();await page.screenshot({path:'evidence/android-portrait-menu.png'});
 });
});
