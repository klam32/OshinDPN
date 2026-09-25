import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalTeardown: './tests/teardown.js',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8001',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: '.venv\\Scripts\\python tests/e2e_server.py',
    url: 'http://127.0.0.1:8001/api/health',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
