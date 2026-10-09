import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests', timeout: 60000, workers: 1,
    use: { baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:8000', viewport: { width: 390, height: 844 }, trace: 'retain-on-failure', channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
    reporter: 'list',
});
