import { test, expect } from '@playwright/test'

test.describe('대시보드 메인 화면 로드 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 메인 페이지 진입
    await page.goto('/')
  })

  test('3D WebGL 캔버스가 정상적으로 마운트되는지 확인', async ({ page }) => {
    // Cesium Viewer에 의해 생성되는 canvas 엘리먼트가 존재하는지 확인
    const canvas = page.locator('#cesiumContainer canvas')
    await expect(canvas).toBeVisible()
  })

  test('대시보드 주요 UI 컴포넌트가 화면에 표시되는지 확인', async ({ page }) => {
    // 1. 헤더 영역 및 앱 타이틀 확인
    const title = page.locator('h1')
    await expect(title).toContainText('Route of Sky')
    const logo = page.getByAltText('Route of Sky')
    await expect(logo).toHaveAttribute('src', '/logo.webp')
    await expect
      .poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBe(128)

    // 2. 환경 정보 (Environment Specs) 위젯 표시 확인
    const envSpecsHeader = page.locator('h2', { hasText: '환경 정보' })
    await expect(envSpecsHeader).toBeVisible()

    // 3. 하늘 상태 (Sky Conditions) 위젯 표시 확인
    const skyConditionsHeader = page.locator('h2', { hasText: '하늘 상태' })
    await expect(skyConditionsHeader).toBeVisible()

    // 4. 대기질 정보 (Atmosphere Quality) 위젯 표시 확인
    const atmosphereHeader = page.locator('h2', { hasText: '대기질 정보' })
    await expect(atmosphereHeader).toBeVisible()
  })

  test('High/Medium/Low 품질을 즉시 적용하고 새로고침 후 복원한다', async ({ page }) => {
    await page.getByRole('button', { name: 'Open settings' }).click()
    const qualitySelect = page.getByLabel('렌더링 품질')
    const scene = page.locator('section[data-quality-level]')

    for (const level of ['high', 'medium', 'low']) {
      await qualitySelect.selectOption(level)
      await expect(scene).toHaveAttribute('data-quality-level', level)
    }

    await page.reload()
    await page.getByRole('button', { name: 'Open settings' }).click()
    await expect(page.getByLabel('렌더링 품질')).toHaveValue('low')
    await expect(scene).toHaveAttribute('data-quality-level', 'low')
  })
})
