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
 const submit=await page.request.post('/api/results',{headers:{Authorization:`Bearer ${p.token}`},data:{stage:0,shots:2,timeMs:4500}});expect(submit.ok()).toBe(true);
 await page.locator('#leaderboardBtn').click();await expect(page.locator('#rankingRows')).toContainText('在线测试玩家');await expect(page.locator('#rankingRows tr.self')).toContainText('1/10');
 await page.locator('#leaderboardBack').click();await page.locator('#profileBtn').click();await page.locator('#nickname').fill('改名玩家');await page.locator('#saveProfile').click();
 await page.locator('#leaderboardBtn').click();await expect(page.locator('#rankingRows tr.self')).toContainText('改名玩家');expect(errors).toEqual([]);
});

test.describe('Android 触屏布局与实际输入',()=>{
 test.use({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 test('触摸取消不消耗弹药，物品按钮唤回库存，暂停冻结物理',async({page,context})=>{
  await page.goto('/');await page.waitForFunction(()=>window.MCBlockLaunch);await page.locator('#nickname').fill('手机测试');await page.locator('#saveProfile').tap();await page.locator('#level-0').tap();
  await expect(page.locator('#touchPause')).toBeVisible();const box=await page.locator('#stage').boundingBox(),p=await page.evaluate(()=>MCBlockLaunch.getStatus().launcher);
  const cdp=await context.newCDPSession(page),point={x:box.x+p.x*box.width/1536,y:box.y+p.y*box.height/864};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-38,y:point.y+18,id:1}]});
  await expect(page.locator('#touchCancel')).toBeVisible();const cancel=await page.locator('#touchCancel').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x-38,y:point.y+18,id:1},{x:cancel.x+cancel.width/2,y:cancel.y+cancel.height/2,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(await page.evaluate(()=>MCBlockLaunch.getStatus().launched)).toBe(0);
  await expect(page.locator('#inventory')).toHaveClass(/tucked/,{timeout:6000});await page.locator('#touchInventory').tap();await expect(page.locator('#inventory')).not.toHaveClass(/tucked/);
  await page.locator('#touchPause').tap();const time=await page.evaluate(()=>MCBlockLaunch.getStatus().time);await page.waitForTimeout(200);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().time)).toBe(time);
  await page.locator('#resume').tap();await page.screenshot({path:'evidence/android-landscape.png'});
  await page.setViewportSize({width:390,height:844});await expect(page.locator('#rotateHint')).toBeVisible();await page.locator('#touchPause').tap();await page.locator('#levelMenuBtn').tap();
  await expect(page.locator('#level-9')).toBeVisible();await page.screenshot({path:'evidence/android-portrait-menu.png'});
 });
});
