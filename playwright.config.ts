// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e', // E2E 테스트 파일 위치
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173', // Vite 기본 포트
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
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
