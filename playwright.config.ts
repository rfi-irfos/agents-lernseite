import { defineConfig, devices } from '@playwright/test'

// Die Specs laufen gegen den Vite-Dev-Server. Nur pwa.spec.ts braucht den echten Build
// (einen Service Worker gibt es nur dort) und läuft gegen `vite preview`.
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  reporter: 'list',
  projects: [
    {
      name: 'chromium',
      testIgnore: /pwa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' },
    },
    {
      name: 'pwa',
      testMatch: /pwa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4174' },
    },
  ],
  webServer: [
    {
      command: 'npx vite --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
    },
    {
      command: 'npm run build && npx vite preview --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: false,
      timeout: 180000,
    },
  ],
})
