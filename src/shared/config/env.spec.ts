import { afterEach, describe, expect, it, vi } from 'vitest'

describe('Cesium env config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('토큰 env가 없으면 빈 문자열과 비활성 상태를 반환해야 한다', async () => {
    vi.stubEnv('VITE_CESIUM_ION_ACCESS_TOKEN', '')
    vi.stubEnv('VITE_WEATHER_API_KEY', '')
    vi.resetModules()

    const env = await import('./env')

    expect(env.cesiumIonAccessToken).toBe('')
    expect(env.hasCesiumIonAccessToken).toBe(false)
    expect(env.weatherApiKey).toBe('')
    expect(env.hasWeatherApiKey).toBe(false)
  })

  it('날씨 API 키가 있으면 실시간 날씨 연동을 활성화해야 한다', async () => {
    vi.stubEnv('VITE_WEATHER_API_KEY', 'weather-key')
    vi.resetModules()

    const env = await import('./env')

    expect(env.weatherApiKey).toBe('weather-key')
    expect(env.hasWeatherApiKey).toBe(true)
  })
})
