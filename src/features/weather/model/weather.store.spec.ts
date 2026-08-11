import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWeatherCacheKey, WEATHER_CACHE_TTL_MS, writeWeatherCache } from './weather.cache'
import { defaultWeatherState } from './weather.constants'
import { useWeatherStore } from './weather.store'
import type { WeatherState } from './weather.types'

vi.mock('@/shared/config/env', () => ({
  weatherApiKey: 'test-key',
  hasWeatherApiKey: true,
}))

vi.mock('@/features/weather/api/weatherApi', () => ({
  DEFAULT_WEATHER_LOCATION_QUERY: '40.758,-73.9855',
  fetchCurrentWeather: vi.fn(),
}))

import { fetchCurrentWeather } from '@/features/weather/api/weatherApi'

const mockedFetchCurrentWeather = vi.mocked(fetchCurrentWeather)

function createWeatherState(overrides: Partial<WeatherState> = {}): WeatherState {
  return {
    ...defaultWeatherState,
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

describe('날씨 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    window.localStorage.clear()
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
      expect.any(AbortSignal),
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

  it('5분 이내 캐시가 있으면 네트워크 요청 없이 즉시 반영해야 한다', async () => {
    const now = Date.now()
    const cachedWeather = createWeatherState({ temperature: 17, visibility: 8 })
    writeWeatherCache('37.5512,126.9882', cachedWeather, now - 30_000)
    const store = useWeatherStore()

    await expect(store.loadCurrentWeather('37.5512,126.9882')).resolves.toBe(true)

    expect(mockedFetchCurrentWeather).not.toHaveBeenCalled()
    expect(store.temperature).toBe(17)
    expect(store.visibility).toBe(8)
    expect(store.dataSource).toBe('cache')
    expect(store.cacheAgeMs).toBeGreaterThanOrEqual(30_000)
    expect(store.cacheHitCount).toBe(1)
    expect(store.networkRequestCount).toBe(0)
  })

  it('5분이 지난 캐시는 정상 요청 경로에서 사용하지 않아야 한다', async () => {
    const now = Date.now()
    writeWeatherCache(
      '37.5512,126.9882',
      createWeatherState({ temperature: 5 }),
      now - WEATHER_CACHE_TTL_MS - 1,
    )
    mockedFetchCurrentWeather.mockResolvedValue(createWeatherState({ temperature: 19 }))
    const store = useWeatherStore()

    await expect(store.loadCurrentWeather('37.5512,126.9882')).resolves.toBe(true)

    expect(mockedFetchCurrentWeather).toHaveBeenCalledTimes(1)
    expect(store.temperature).toBe(19)
    expect(store.dataSource).toBe('network')
    expect(store.cacheMissCount).toBe(1)
  })

  it('강제 갱신은 유효 캐시를 우회해야 한다', async () => {
    writeWeatherCache('37.5512,126.9882', createWeatherState({ temperature: 5 }), Date.now())
    mockedFetchCurrentWeather.mockResolvedValue(createWeatherState({ temperature: 21 }))
    const store = useWeatherStore()

    await expect(store.loadCurrentWeather('37.5512,126.9882', { force: true })).resolves.toBe(true)

    expect(mockedFetchCurrentWeather).toHaveBeenCalledTimes(1)
    expect(store.temperature).toBe(21)
    expect(store.forcedRefreshCount).toBe(1)
    expect(store.cacheHitCount).toBe(0)
  })

  it('손상된 캐시는 제거하고 네트워크 요청으로 복구해야 한다', async () => {
    const key = createWeatherCacheKey('37.5512,126.9882')
    window.localStorage.setItem(key, '{broken-json')
    mockedFetchCurrentWeather.mockResolvedValue(createWeatherState({ temperature: 23 }))
    const store = useWeatherStore()

    await expect(store.loadCurrentWeather('37.5512,126.9882')).resolves.toBe(true)

    expect(mockedFetchCurrentWeather).toHaveBeenCalledTimes(1)
    expect(store.temperature).toBe(23)
    expect(() => JSON.parse(window.localStorage.getItem(key) ?? '')).not.toThrow()
  })

  it('같은 지역의 동시 요청은 하나의 네트워크 Promise를 공유해야 한다', async () => {
    const deferred = createDeferred<WeatherState>()
    mockedFetchCurrentWeather.mockReturnValue(deferred.promise)
    const store = useWeatherStore()

    const first = store.loadCurrentWeather('37.5512,126.9882')
    const second = store.loadCurrentWeather('37.5512,126.9882')

    expect(mockedFetchCurrentWeather).toHaveBeenCalledTimes(1)
    deferred.resolve(createWeatherState({ temperature: 25 }))
    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    expect(store.networkRequestCount).toBe(1)
    expect(store.temperature).toBe(25)
  })

  it('늦게 도착한 이전 지역 응답은 현재 지역을 덮어쓰지 않아야 한다', async () => {
    const seoul = createDeferred<WeatherState>()
    const tokyo = createDeferred<WeatherState>()
    mockedFetchCurrentWeather.mockImplementation((_key, query) =>
      query === '37.5512,126.9882' ? seoul.promise : tokyo.promise,
    )
    const store = useWeatherStore()

    const seoulLoad = store.loadCurrentWeather('37.5512,126.9882')
    const tokyoLoad = store.loadCurrentWeather('35.6586,139.7454')
    tokyo.resolve(createWeatherState({ temperature: 28 }))
    await expect(tokyoLoad).resolves.toBe(true)
    seoul.resolve(createWeatherState({ temperature: 11 }))
    await expect(seoulLoad).resolves.toBe(false)

    expect(store.temperature).toBe(28)
    expect(store.networkRequestCount).toBe(2)
  })

  it('네트워크 오류 시 만료 캐시를 복구용으로 사용해야 한다', async () => {
    writeWeatherCache(
      '37.5512,126.9882',
      createWeatherState({ temperature: 13 }),
      Date.now() - WEATHER_CACHE_TTL_MS - 10_000,
    )
    mockedFetchCurrentWeather.mockRejectedValue(new Error('network down'))
    const store = useWeatherStore()

    await expect(store.loadCurrentWeather('37.5512,126.9882')).resolves.toBe(true)

    expect(store.temperature).toBe(13)
    expect(store.dataSource).toBe('stale-cache')
    expect(store.errorMessage).toContain('저장된 날씨')
    expect(store.cacheAgeMs).toBeGreaterThan(WEATHER_CACHE_TTL_MS)
  })
})
