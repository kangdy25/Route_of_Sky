import { expect, test, type Page } from '@playwright/test'

const WEATHER_API_PATTERN = '**/api/weather?**'

type WeatherMock = {
  name: string
  localtime: string
  tempC: number
  minTempC: number
  maxTempC: number
  humidity: number
  windKph: number
  windDegree: number
  cloud: number
  precipMm: number
  visibilityKm: number
  pm25: number
}

const weatherByQuery: Record<string, WeatherMock> = {
  '40.758,-73.9855': {
    name: 'New York',
    localtime: '2026-06-27 09:30',
    tempC: 23.4,
    minTempC: 18.2,
    maxTempC: 29.6,
    humidity: 49,
    windKph: 18,
    windDegree: 225,
    cloud: 36,
    precipMm: 0.2,
    visibilityKm: 16,
    pm25: 8,
  },
  '35.6586,139.7454': {
    name: 'Tokyo',
    localtime: '2026-06-27 21:45',
    tempC: 28.1,
    minTempC: 24.4,
    maxTempC: 33.2,
    humidity: 73,
    windKph: 7.2,
    windDegree: 90,
    cloud: 82,
    precipMm: 4.6,
    visibilityKm: 6.4,
    pm25: 22.8,
  },
}

function createWeatherPayload(weather: WeatherMock) {
  return {
    location: {
      name: weather.name,
      localtime: weather.localtime,
    },
    current: {
      temp_c: weather.tempC,
      humidity: weather.humidity,
      wind_kph: weather.windKph,
      wind_degree: weather.windDegree,
      cloud: weather.cloud,
      precip_mm: weather.precipMm,
      vis_km: weather.visibilityKm,
      air_quality: {
        pm2_5: weather.pm25,
        'us-epa-index': 2,
      },
    },
    forecast: {
      forecastday: [
        {
          day: {
            mintemp_c: weather.minTempC,
            maxtemp_c: weather.maxTempC,
          },
        },
      ],
    },
  }
}

async function mockWeatherApi(page: Page, shouldFail = () => false) {
  const queries: string[] = []

  await page.addInitScript(() => {
    const initializedKey = 'route-of-sky:e2e-storage-initialized'
    if (window.sessionStorage.getItem(initializedKey)) return

    window.localStorage.clear()
    window.sessionStorage.setItem(initializedKey, 'true')
  })

  await page.route(WEATHER_API_PATTERN, async (route) => {
    const url = new URL(route.request().url())
    const query = url.searchParams.get('q') ?? ''
    const weather = weatherByQuery[query] ?? weatherByQuery['40.758,-73.9855']

    queries.push(query)

    if (shouldFail()) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Weather service unavailable' } }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createWeatherPayload(weather)),
    })
  })

  return queries
}

async function expectWeatherRequest(queries: string[], query: string) {
  await expect.poll(() => queries).toContain(query)
}

async function expectPageText(page: Page, text: string) {
  await expect
    .poll(async () => page.locator('body').innerText(), { timeout: 15_000 })
    .toContain(text)
}

async function expectMetricText(page: Page, title: string, value: string) {
  await expectPageText(page, title)
  await expectPageText(page, value)
}

test.describe('WeatherAPI 통합 흐름', () => {
  test.describe.configure({ timeout: 60_000 })

  test('초기 선택 지역의 WeatherAPI 응답을 대시보드 값에 바인딩해야 한다', async ({ page }) => {
    const queries = await mockWeatherApi(page)

    await page.goto('/')

    await expectWeatherRequest(queries, '40.758,-73.9855')
    await expect(page.getByRole('combobox', { name: '지역 선택' })).toHaveValue('us-new-york')
    await expectPageText(page, '09:30')
    await expectMetricText(page, '가시 거리', '16 km')
    await expectMetricText(page, '최저 기온', '18.2°')
    await expectMetricText(page, '최고 기온', '29.6°')
    await expectMetricText(page, '습도', '49%')
  })

  test('지역을 변경하면 새 좌표로 날씨를 재호출하고 화면 값을 교체해야 한다', async ({ page }) => {
    const queries = await mockWeatherApi(page)

    await page.goto('/')
    await expectWeatherRequest(queries, '40.758,-73.9855')
    await expectPageText(page, '09:30')

    const locationSelect = page.getByRole('combobox', { name: '지역 선택' })
    await locationSelect.selectOption('jp-tokyo', { force: true })

    await expectWeatherRequest(queries, '35.6586,139.7454')
    await expect(locationSelect).toHaveValue('jp-tokyo')
    await expectPageText(page, '21:45')
    await expectMetricText(page, '가시 거리', '6.4 km')
    await expectMetricText(page, '최저 기온', '24.4°')
    await expectMetricText(page, '최고 기온', '33.2°')
    await expectMetricText(page, '강수량', '4.6 mm/h')
  })

  test('새로고침 후에는 마지막 지역의 5분 캐시를 사용해 API 재호출을 생략해야 한다', async ({
    page,
  }) => {
    const queries = await mockWeatherApi(page)

    await page.goto('/')
    await expectWeatherRequest(queries, '40.758,-73.9855')
    await expectPageText(page, '09:30')
    const locationSelect = page.getByRole('combobox', { name: '지역 선택' })
    await locationSelect.selectOption('jp-tokyo', { force: true })
    await expectWeatherRequest(queries, '35.6586,139.7454')
    await expectPageText(page, '21:45')

    queries.length = 0
    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('combobox', { name: '지역 선택' })).toHaveValue('jp-tokyo')
    await expectPageText(page, '21:45')
    await expectMetricText(page, '가시 거리', '6.4 km')
    await page.waitForTimeout(500)
    expect(queries).toEqual([])
  })

  test('현재 날씨 강제 렌더링은 유효 캐시를 우회해 API를 다시 호출해야 한다', async ({ page }) => {
    const queries = await mockWeatherApi(page)

    await page.goto('/')
    await expectWeatherRequest(queries, '40.758,-73.9855')
    queries.length = 0

    await page.getByRole('button', { name: 'Open settings' }).click()
    await page.getByRole('button', { name: 'Render Current Weather' }).click({ force: true })

    await expectWeatherRequest(queries, '40.758,-73.9855')
  })

  test('초기 요청 실패 후 재시도하면 실시간 날씨를 다시 표시해야 한다', async ({ page }) => {
    let failRequest = true
    const queries = await mockWeatherApi(page, () => failRequest)

    await page.goto('/')
    await expectWeatherRequest(queries, '40.758,-73.9855')
    await expect(page.getByTestId('weather-sync-alert')).toContainText(
      '현재 값은 최신 정보가 아닐 수 있습니다.',
    )
    await expectPageText(page, '날씨 업데이트 실패')

    failRequest = false
    await page.getByRole('button', { name: 'Retry weather update' }).click()

    await expect.poll(() => queries.filter((query) => query === '40.758,-73.9855')).toHaveLength(2)
    await expectPageText(page, '실시간 데이터')
    await expect(page.getByTestId('weather-sync-alert')).toHaveCount(0)
  })

  test('만료 캐시에서 네트워크 요청이 실패하면 경고와 저장된 날씨를 표시해야 한다', async ({
    page,
  }) => {
    let failRequest = false
    const queries = await mockWeatherApi(page, () => failRequest)

    await page.goto('/')
    await expectWeatherRequest(queries, '40.758,-73.9855')
    await page.evaluate(() => {
      window.localStorage.setItem(
        'route-of-sky:weather-cache:v1:40.758,-73.9855',
        JSON.stringify({
          version: 1,
          fetchedAt: Date.now() - 5 * 60 * 1000 - 1,
          weather: {
            time: 9.5,
            temperature: 11,
            temperatureMin: 7,
            temperatureMax: 14,
            humidity: 55,
            windSpeed: 3,
            windDirectionDegrees: 180,
            aqi: 40,
            cloudCover: 30,
            precipitation: 0,
            visibility: 12,
          },
        }),
      )
    })

    failRequest = true
    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect.poll(() => queries.filter((query) => query === '40.758,-73.9855')).toHaveLength(2)
    await expect(page.getByTestId('weather-sync-alert')).toContainText(
      '저장된 날씨를 계속 표시합니다.',
    )
    await expectPageText(page, '저장된 날씨 표시 중')
    await expectMetricText(page, '가시 거리', '12 km')
  })
})
