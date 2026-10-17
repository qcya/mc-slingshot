const { test, expect } = require('@playwright/test');

test('本地 Matter 模式启动，必需资源不缺失且五关可切换', async ({ page }) => {
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failed.push(r.url()); });
  await page.goto('/');
  await page.waitForFunction(() => window.MCBlockLaunch);
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  expect(await page.evaluate(() => MCBlockLaunch.getStatus().physics)).toBe('Matter.js');
  for (let i = 1; i <= 5; i++) {
    expect(await page.evaluate(() => MCBlockLaunch.getStatus().level)).toBe(i);
    await page.getByRole('button', { name: '切换关卡 →', exact: true }).click();
  }
  expect(errors).toEqual([]);
});

test('引擎缺失时显示明确错误，不能静默进入降级物理',async({page})=>{
  await page.route('**/vendor/matter.min.js',route=>route.fulfill({contentType:'text/javascript',body:'/* deliberately unavailable engine */'}));
  await page.goto('/');
  await expect(page.locator('#loadState')).toBeVisible();
  await expect(page.locator('#loadState')).toContainText('Matter.js');
  expect(await page.evaluate(()=>!!window.MCBlockLaunch)).toBe(false);
});

test('入口被损坏也显示启动错误，避免留下无提示白屏',async({page})=>{
  await page.route('**/game.js',route=>route.fulfill({contentType:'text/javascript',body:'TOOL ERROR: invalid JavaScript body !!'}));
  await page.goto('/');
  await expect(page.locator('#loadState')).toBeVisible();
  await expect(page.locator('#loadState')).toContainText('加载失败');
});
