// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e', // E2E 테스트 파일 위치
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:5173', // Vite 기본 포트
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 필요에 따라 firefox나 webkit 추가
  ],
  // 테스트 실행 전 로컬 서버 자동 시작
  webServer: {
    command: './node_modules/.bin/vite --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      VITE_WEATHER_API_KEY: process.env.VITE_WEATHER_API_KEY ?? 'e2e-weather-api-key',
    },
  },
})
