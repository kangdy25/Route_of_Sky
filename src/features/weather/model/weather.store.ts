import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  DEFAULT_WEATHER_LOCATION_QUERY,
  fetchCurrentWeather,
} from '@/features/weather/api/weatherApi'
import { readWeatherCache, writeWeatherCache } from './weather.cache'
import { defaultWeatherState } from './weather.constants'
import type { WeatherState } from './weather.types'

export type WeatherDataSource = 'default' | 'cache' | 'network' | 'stale-cache'

export interface LoadCurrentWeatherOptions {
  fetcher?: typeof fetch
  force?: boolean
}

interface PendingWeatherRequest {
  controller: AbortController
  promise: Promise<WeatherState>
}

/** 날씨 상태를 앱 레이아웃과 3D 씬이 함께 참조할 수 있도록 관리합니다. */
export const useWeatherStore = defineStore('weather', () => {
  const time = ref(defaultWeatherState.time)
  const temperature = ref(defaultWeatherState.temperature)
  const temperatureMin = ref(defaultWeatherState.temperatureMin)
  const temperatureMax = ref(defaultWeatherState.temperatureMax)
  const humidity = ref(defaultWeatherState.humidity)
  const windSpeed = ref(defaultWeatherState.windSpeed)
  const windDirectionDegrees = ref(defaultWeatherState.windDirectionDegrees)
  const aqi = ref(defaultWeatherState.aqi)
  const cloudCover = ref(defaultWeatherState.cloudCover)
  const precipitation = ref(defaultWeatherState.precipitation)
  const visibility = ref(defaultWeatherState.visibility)
  const isLoading = ref(false)
  const errorMessage = ref('')
  const lastUpdatedAt = ref<number | null>(null)
  const dataSource = ref<WeatherDataSource>('default')
  const cacheAgeMs = ref<number | null>(null)
  const cacheHitCount = ref(0)
  const cacheMissCount = ref(0)
  const networkRequestCount = ref(0)
  const forcedRefreshCount = ref(0)
  const pendingRequests = new Map<string, PendingWeatherRequest>()
  let activeLocationQuery = ''

  function applyWeatherState(state: WeatherState) {
    time.value = state.time
    temperature.value = state.temperature
    temperatureMin.value = state.temperatureMin
    temperatureMax.value = state.temperatureMax
    humidity.value = state.humidity
    windSpeed.value = state.windSpeed
    windDirectionDegrees.value = state.windDirectionDegrees
    aqi.value = state.aqi
    cloudCover.value = state.cloudCover
    precipitation.value = state.precipitation
    visibility.value = state.visibility
  }

  function markWeatherPerformance(name: string) {
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      performance.mark(name)
    }
  }

  function measureWeatherPerformance(name: string, startedAt: number) {
    if (typeof performance !== 'undefined' && typeof performance.measure === 'function') {
      performance.measure(name, { start: startedAt, end: performance.now() })
    }
  }

  function getOrCreateRequest(locationQuery: string, fetcher: typeof fetch, force: boolean) {
    const requestKey = `${locationQuery}:${force ? 'fresh' : 'cached'}`
    const existing = pendingRequests.get(requestKey)
    if (existing) return existing

    for (const [pendingKey, pending] of pendingRequests) {
      if (pendingKey !== requestKey) {
        pending.controller.abort()
        pendingRequests.delete(pendingKey)
      }
    }

    const controller = new AbortController()
    const request: PendingWeatherRequest = {
      controller,
      promise: fetchCurrentWeather(locationQuery, {
        fetcher,
        signal: controller.signal,
      }),
    }
    pendingRequests.set(requestKey, request)
    networkRequestCount.value += 1

    const removePendingRequest = () => {
      if (pendingRequests.get(requestKey) === request) {
        pendingRequests.delete(requestKey)
      }
    }
    void request.promise.then(removePendingRequest, removePendingRequest)

    return request
  }

  async function loadCurrentWeather(
    locationQuery = DEFAULT_WEATHER_LOCATION_QUERY,
    options: LoadCurrentWeatherOptions = {},
  ) {
    const cacheLookupStartedAt = typeof performance === 'undefined' ? 0 : performance.now()
    const cached = readWeatherCache(locationQuery)
    activeLocationQuery = locationQuery

    if (!options.force && cached?.isFresh) {
      applyWeatherState(cached.weather)
      dataSource.value = 'cache'
      cacheAgeMs.value = cached.ageMs
      cacheHitCount.value += 1
      lastUpdatedAt.value = cached.fetchedAt
      errorMessage.value = ''
      isLoading.value = false
      markWeatherPerformance('route-of-sky:weather-cache-hit')
      measureWeatherPerformance('route-of-sky:weather-cache-hydration', cacheLookupStartedAt)
      return true
    }

    if (options.force) {
      forcedRefreshCount.value += 1
    } else {
      cacheMissCount.value += 1
    }
    isLoading.value = true
    errorMessage.value = ''
    const request = getOrCreateRequest(
      locationQuery,
      options.fetcher ?? fetch,
      Boolean(options.force),
    )

    try {
      const weather = await request.promise
      if (activeLocationQuery !== locationQuery) return false

      const fetchedAt = Date.now()
      applyWeatherState(weather)
      writeWeatherCache(locationQuery, weather, fetchedAt)
      dataSource.value = 'network'
      cacheAgeMs.value = 0
      lastUpdatedAt.value = fetchedAt
      markWeatherPerformance('route-of-sky:weather-network')

      return true
    } catch (error) {
      if (activeLocationQuery !== locationQuery) return false

      if (cached) {
        applyWeatherState(cached.weather)
        dataSource.value = 'stale-cache'
        cacheAgeMs.value = cached.ageMs
        lastUpdatedAt.value = cached.fetchedAt
        errorMessage.value = '실시간 날씨를 불러오지 못해 저장된 날씨를 표시합니다.'
        markWeatherPerformance('route-of-sky:weather-stale-cache')
        return true
      }

      errorMessage.value =
        error instanceof Error ? error.message : '실시간 날씨 정보를 불러오지 못했습니다.'

      return false
    } finally {
      if (activeLocationQuery === locationQuery) {
        isLoading.value = false
      }
    }
  }

  return {
    time,
    temperature,
    temperatureMin,
    temperatureMax,
    humidity,
    windSpeed,
    windDirectionDegrees,
    aqi,
    cloudCover,
    precipitation,
    visibility,
    isLoading,
    errorMessage,
    lastUpdatedAt,
    dataSource,
    cacheAgeMs,
    cacheHitCount,
    cacheMissCount,
    networkRequestCount,
    forcedRefreshCount,
    applyWeatherState,
    loadCurrentWeather,
  }
})
