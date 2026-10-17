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
