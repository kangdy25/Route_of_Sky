import type { WeatherState } from './weather.types'

const WEATHER_CACHE_VERSION = 1
const WEATHER_CACHE_PREFIX = `route-of-sky:weather-cache:v${WEATHER_CACHE_VERSION}`

export const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000

interface WeatherCacheEntry {
  version: number
  fetchedAt: number
  weather: WeatherState
}

export interface WeatherCacheResult {
  fetchedAt: number
  ageMs: number
  isFresh: boolean
  weather: WeatherState
}

const WEATHER_STATE_KEYS = [
  'time',
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
] as const satisfies readonly (keyof WeatherState)[]

export function createWeatherCacheKey(locationQuery: string) {
  return `${WEATHER_CACHE_PREFIX}:${locationQuery}`
}

function getStorage() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isWeatherState(value: unknown): value is WeatherState {
  if (!value || typeof value !== 'object') return false

  return WEATHER_STATE_KEYS.every((key) => {
    const field = (value as Record<string, unknown>)[key]
    return typeof field === 'number' && Number.isFinite(field)
  })
}

function isWeatherCacheEntry(value: unknown): value is WeatherCacheEntry {
  if (!value || typeof value !== 'object') return false

  const entry = value as Partial<WeatherCacheEntry>
  return (
    entry.version === WEATHER_CACHE_VERSION &&
    typeof entry.fetchedAt === 'number' &&
    Number.isFinite(entry.fetchedAt) &&
    isWeatherState(entry.weather)
  )
}

export function readWeatherCache(
  locationQuery: string,
  now = Date.now(),
): WeatherCacheResult | null {
  const storage = getStorage()
  if (!storage) return null

  const key = createWeatherCacheKey(locationQuery)

  try {
    const serialized = storage.getItem(key)
    if (!serialized) return null

    const entry: unknown = JSON.parse(serialized)
    if (!isWeatherCacheEntry(entry)) {
      storage.removeItem(key)
      return null
    }

    const ageMs = Math.max(0, now - entry.fetchedAt)
    return {
      fetchedAt: entry.fetchedAt,
      ageMs,
      isFresh: ageMs <= WEATHER_CACHE_TTL_MS,
      weather: entry.weather,
    }
  } catch {
    try {
      storage.removeItem(key)
    } catch {
      // 저장소가 잠긴 환경에서는 메모리 상태만 유지합니다.
    }
    return null
  }
}

export function writeWeatherCache(locationQuery: string, weather: WeatherState, fetchedAt: number) {
  const storage = getStorage()
  if (!storage) return false

  const entry: WeatherCacheEntry = {
    version: WEATHER_CACHE_VERSION,
    fetchedAt,
    weather,
  }

  try {
    storage.setItem(createWeatherCacheKey(locationQuery), JSON.stringify(entry))
    return true
  } catch {
    return false
  }
}
