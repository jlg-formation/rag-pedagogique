import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173/rag-pedagogique/',
    channel: 'chromium',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun dev',
    url: 'http://localhost:5173/rag-pedagogique/',
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
})
