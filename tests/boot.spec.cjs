const {test,expect}=require('@playwright/test');const {ready,chooseLevel}=require('./browser-helpers.cjs');
test('正常 Matter 启动，四种弹药资源完整，选关菜单可切换已解锁关卡',async({page})=>{
 const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await ready(page);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().physics)).toBe('Matter.js');
 for(let i=1;i<10;i++){await chooseLevel(page,i);expect(await page.evaluate(()=>MCBlockLaunch.getStatus().level)).toBe(i+1);}
 expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('引擎缺失时显示明确错误，不能静默进入降级物理',async({page})=>{
 await page.route('**/vendor/matter.min.js',r=>r.fulfill({contentType:'text/javascript',body:'/* unavailable engine */'}));await page.goto('/');
 await expect(page.locator('#loadState')).toBeVisible();await expect(page.locator('#loadState')).toContainText('Matter.js');expect(await page.evaluate(()=>!!window.MCBlockLaunch)).toBe(false);
});
test('损坏入口显示错误，避免无提示白屏',async({page})=>{
 await page.route('**/game.js',r=>r.fulfill({contentType:'text/javascript',body:'TOOL ERROR: invalid JavaScript !!'}));await page.goto('/');
 await expect(page.locator('#loadState')).toContainText('加载失败');
});
