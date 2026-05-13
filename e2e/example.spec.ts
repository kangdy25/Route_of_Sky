import { test, expect } from '@playwright/test'

test('메인 페이지 로드 확인', async ({ page }) => {
  await page.goto('/')
  // 프로젝트 제목이 포함되어 있는지 확인
  await expect(page).toHaveTitle(/route-of-sky/i)
})
