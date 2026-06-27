import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultWeatherState } from './weather.constants'
import { useWeatherStore } from './weather.store'

vi.mock('@/shared/config/env', () => ({
  weatherApiKey: 'test-key',
  hasWeatherApiKey: true,
}))

vi.mock('@/features/weather/api/weatherApi', () => ({
  fetchCurrentWeather: vi.fn(),
}))

import { fetchCurrentWeather } from '@/features/weather/api/weatherApi'

const mockedFetchCurrentWeather = vi.mocked(fetchCurrentWeather)

describe('날씨 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('기본 날씨 상태로 초기화되어야 한다', () => {
    const store = useWeatherStore()

    expect(store.time).toBe(defaultWeatherState.time)
    expect(store.temperature).toBe(defaultWeatherState.temperature)
    expect(store.temperatureMin).toBe(defaultWeatherState.temperatureMin)
    expect(store.temperatureMax).toBe(defaultWeatherState.temperatureMax)
    expect(store.humidity).toBe(defaultWeatherState.humidity)
    expect(store.windSpeed).toBe(defaultWeatherState.windSpeed)
    expect(store.windDirectionDegrees).toBe(defaultWeatherState.windDirectionDegrees)
    expect(store.aqi).toBe(defaultWeatherState.aqi)
    expect(store.cloudCover).toBe(defaultWeatherState.cloudCover)
    expect(store.precipitation).toBe(defaultWeatherState.precipitation)
    expect(store.visibility).toBe(defaultWeatherState.visibility)
  })

  it('날씨 상태 값을 갱신할 수 있어야 한다', () => {
    const store = useWeatherStore()

    store.temperature = -4
    store.precipitation = 5.5
    store.visibility = 3

    expect(store.temperature).toBe(-4)
    expect(store.precipitation).toBe(5.5)
    expect(store.visibility).toBe(3)
  })

  it('실시간 날씨를 불러오면 store 상태를 갱신해야 한다', async () => {
    mockedFetchCurrentWeather.mockResolvedValue({
      time: 14.5,
      temperature: 21,
      temperatureMin: 16,
      temperatureMax: 27,
      humidity: 58,
      windSpeed: 4,
      windDirectionDegrees: 270,
      aqi: 72,
      cloudCover: 44,
      precipitation: 0.5,
      visibility: 12,
    })
    const store = useWeatherStore()

    await expect(store.loadCurrentWeather('37.5512,126.9882')).resolves.toBe(true)

    expect(mockedFetchCurrentWeather).toHaveBeenCalledWith(
      'test-key',
      '37.5512,126.9882',
      expect.any(Function),
    )
    expect(store.temperature).toBe(21)
    expect(store.temperatureMin).toBe(16)
    expect(store.temperatureMax).toBe(27)
    expect(store.humidity).toBe(58)
    expect(store.windSpeed).toBe(4)
    expect(store.windDirectionDegrees).toBe(270)
    expect(store.aqi).toBe(72)
    expect(store.cloudCover).toBe(44)
    expect(store.precipitation).toBe(0.5)
    expect(store.visibility).toBe(12)
    expect(store.errorMessage).toBe('')
    expect(store.lastUpdatedAt).toEqual(expect.any(Number))
  })

  it('실시간 날씨 호출 실패 시 기존 상태를 유지하고 오류 메시지를 저장해야 한다', async () => {
    mockedFetchCurrentWeather.mockRejectedValue(new Error('날씨 API 오류'))
    const store = useWeatherStore()

    await expect(store.loadCurrentWeather()).resolves.toBe(false)

    expect(store.temperature).toBe(defaultWeatherState.temperature)
    expect(store.errorMessage).toBe('날씨 API 오류')
    expect(store.isLoading).toBe(false)
  })

  it('실시간 날씨 호출이 Error가 아닌 값으로 실패하면 기본 오류 메시지를 저장해야 한다', async () => {
    mockedFetchCurrentWeather.mockRejectedValue('날씨 API 문자열 오류')
    const store = useWeatherStore()

    await expect(store.loadCurrentWeather()).resolves.toBe(false)

    expect(store.errorMessage).toBe('실시간 날씨 정보를 불러오지 못했습니다.')
    expect(store.isLoading).toBe(false)
  })
})
