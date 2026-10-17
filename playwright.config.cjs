const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', testMatch: '**/*.spec.cjs', timeout: 45000,
  workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:8766', viewport: { width: 1536, height: 1100 },
    channel: process.env.CI?undefined:'msedge', screenshot: 'only-on-failure', trace: 'off' },
  webServer: { command: 'node scripts/serve.cjs',
    url: 'http://127.0.0.1:8766', reuseExistingServer: !process.env.CI }
});
