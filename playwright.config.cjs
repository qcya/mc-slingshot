const { defineConfig } = require('@playwright/test');
const testPort=Number(process.env.PW_TEST_PORT||8766);
module.exports = defineConfig({
  testDir: './tests', testMatch: '**/*.spec.cjs', timeout: 45000,
  workers: 1, reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${testPort}`, viewport: { width: 1536, height: 1100 },
    channel: process.env.CI?undefined:'msedge', screenshot: 'only-on-failure', trace: 'off' },
  webServer: { command: `node scripts/serve.cjs --port ${testPort}`,
    url: `http://127.0.0.1:${testPort}`, reuseExistingServer: !process.env.CI }
});
