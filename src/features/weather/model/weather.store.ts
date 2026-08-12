import { gsap } from 'gsap'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  DEFAULT_WEATHER_LOCATION_QUERY,
  fetchCurrentWeather,
} from '@/features/weather/api/weatherApi'
import { prefersReducedMotion } from '@/shared/lib/motion'
import { readWeatherCache, writeWeatherCache } from './weather.cache'
import { defaultWeatherState } from './weather.constants'
import type { WeatherState, WeatherStatePatch } from './weather.types'

export type WeatherDataSource = 'default' | 'cache' | 'network' | 'stale-cache'

export interface LoadCurrentWeatherOptions {
  fetcher?: typeof fetch
  force?: boolean
  animate?: boolean
}

export interface WeatherTransitionOptions {
  animate?: boolean
}

interface PendingWeatherRequest {
  controller: AbortController
  promise: Promise<WeatherState>
}

function reportPerformanceInDevelopment(
  event: 'weather-cache-hit' | 'weather-network',
  valueMs: number,
) {
  void import('@/shared/lib/performanceTelemetry').then(({ reportDevelopmentPerformance }) => {
    reportDevelopmentPerformance({ event, valueMs })
  })
}

const WEATHER_TRANSITION_DURATION = 0.9
const TIME_TRANSITION_DURATION = 0.7
const weatherTransitionKeys = [
  'temperature',
  'temperatureMin',
  'temperatureMax',
  'humidity',
  'windSpeed',
  'windDirectionDegrees',
  'aqi',
  'cloudCover',
  'precipitation',
  'visibility',
] as const satisfies readonly (keyof Omit<WeatherState, 'time'>)[]

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
  let activeWeatherTween: gsap.core.Tween | null = null
  let activeTimeTween: gsap.core.Tween | null = null
  let weatherTransitionId = 0
  let timeTransitionId = 0

  function applyWeatherStateImmediately(state: WeatherState) {
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

  function getWeatherState(): WeatherState {
    return {
      time: time.value,
      temperature: temperature.value,
      temperatureMin: temperatureMin.value,
      temperatureMax: temperatureMax.value,
      humidity: humidity.value,
      windSpeed: windSpeed.value,
      windDirectionDegrees: windDirectionDegrees.value,
      aqi: aqi.value,
      cloudCover: cloudCover.value,
      precipitation: precipitation.value,
      visibility: visibility.value,
    }
  }

  function applyWeatherPatchImmediately(patch: WeatherStatePatch) {
    if (patch.time !== undefined) time.value = patch.time
    if (patch.temperature !== undefined) temperature.value = patch.temperature
    if (patch.temperatureMin !== undefined) temperatureMin.value = patch.temperatureMin
    if (patch.temperatureMax !== undefined) temperatureMax.value = patch.temperatureMax
    if (patch.humidity !== undefined) humidity.value = patch.humidity
    if (patch.windSpeed !== undefined) windSpeed.value = patch.windSpeed
    if (patch.windDirectionDegrees !== undefined)
      windDirectionDegrees.value = patch.windDirectionDegrees
    if (patch.aqi !== undefined) aqi.value = patch.aqi
    if (patch.cloudCover !== undefined) cloudCover.value = patch.cloudCover
    if (patch.precipitation !== undefined) precipitation.value = patch.precipitation
    if (patch.visibility !== undefined) visibility.value = patch.visibility
  }

  function cancelWeatherTransition() {
    weatherTransitionId += 1
    activeWeatherTween?.kill()
    activeWeatherTween = null
  }

  function cancelTimeTransition() {
    timeTransitionId += 1
    activeTimeTween?.kill()
    activeTimeTween = null
  }

  function cancelTransitions() {
    cancelWeatherTransition()
    cancelTimeTransition()
  }

  function applyWeatherPatch(patch: WeatherStatePatch, options: WeatherTransitionOptions = {}) {
    if (!options.animate || prefersReducedMotion()) {
      cancelWeatherTransition()
      applyWeatherPatchImmediately(patch)
      return
    }

    cancelWeatherTransition()
    const transitionId = ++weatherTransitionId
    if (patch.time !== undefined) {
      cancelTimeTransition()
      time.value = patch.time
    }

    const current = getWeatherState()
    const tweenState: Record<(typeof weatherTransitionKeys)[number], number> = {} as Record<
      (typeof weatherTransitionKeys)[number],
      number
    >
    const targets: Partial<Record<(typeof weatherTransitionKeys)[number], number>> = {}

    for (const key of weatherTransitionKeys) {
      tweenState[key] = current[key]
      if (patch[key] !== undefined) {
        targets[key] = patch[key]
      }
    }

    if (Object.keys(targets).length === 0) return

    let completed = false
    const tween = gsap.to(tweenState, {
      ...targets,
      duration: WEATHER_TRANSITION_DURATION,
      ease: 'power2.out',
      onUpdate: () => applyWeatherPatchImmediately(tweenState),
      onComplete: () => {
        completed = true
        if (weatherTransitionId === transitionId) {
          activeWeatherTween = null
          applyWeatherPatchImmediately(patch)
        }
      },
    })
    if (!completed && weatherTransitionId === transitionId) {
      activeWeatherTween = tween
    }
  }

  function applyWeatherState(state: WeatherState, options: WeatherTransitionOptions = {}) {
    if (!options.animate || prefersReducedMotion()) {
      cancelTransitions()
      applyWeatherStateImmediately(state)
      return
    }

    applyWeatherPatch(state, options)
  }

  function setSceneTime(nextTime: number, options: WeatherTransitionOptions = {}) {
    if (!options.animate || prefersReducedMotion()) {
      cancelTimeTransition()
      time.value = nextTime
      return
    }

    cancelTimeTransition()
    const transitionId = ++timeTransitionId
    const tweenState = { value: time.value }
    let completed = false
    const tween = gsap.to(tweenState, {
      value: nextTime,
      duration: TIME_TRANSITION_DURATION,
      ease: 'power2.inOut',
      onUpdate: () => {
        time.value = tweenState.value
      },
      onComplete: () => {
        completed = true
        if (timeTransitionId === transitionId) {
          activeTimeTween = null
          time.value = nextTime
        }
      },
    })
    if (!completed && timeTransitionId === transitionId) {
      activeTimeTween = tween
    }
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
      if (import.meta.env.DEV) {
        reportPerformanceInDevelopment(
          'weather-cache-hit',
          performance.now() - cacheLookupStartedAt,
        )
      }
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
      applyWeatherState(weather, { animate: options.animate })
      writeWeatherCache(locationQuery, weather, fetchedAt)
      dataSource.value = 'network'
      cacheAgeMs.value = 0
      lastUpdatedAt.value = fetchedAt
      markWeatherPerformance('route-of-sky:weather-network')
      if (import.meta.env.DEV) {
        reportPerformanceInDevelopment('weather-network', performance.now() - cacheLookupStartedAt)
      }

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
    applyWeatherPatch,
    setSceneTime,
    cancelTransitions,
    loadCurrentWeather,
  }
})
