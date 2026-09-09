import type { WeatherState } from './weather.types'

// ==========================================
// 1. 캐시 상수 및 인터페이스 정의
// ==========================================

const WEATHER_CACHE_VERSION = 1

/** 로컬 스토리지 키 충돌 방지용 접두사 (Namespace) */
const WEATHER_CACHE_PREFIX = `route-of-sky:weather-cache:v${WEATHER_CACHE_VERSION}`

/** 날씨 캐시 유효 시간 (5분) */
export const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000

/** 로컬 스토리지에 JSON 형태로 저장되는 원본 캐시 데이터 규격 */
interface WeatherCacheEntry {
  version: number
  fetchedAt: number
  weather: WeatherState
}

/** 캐시 조회 시 유효성/경과 시간을 계산하여 스토어에 반환하는 결과 모델 */
export interface WeatherCacheResult {
  fetchedAt: number
  ageMs: number
  isFresh: boolean
  weather: WeatherState
}

/** 런타임 검증을 위한 WeatherState 필수 키 목록 */
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

// ==========================================
// 2. 유틸리티 & 타입 가드 (Type Guards)
// ==========================================

/**
 * 위치 쿼리 문자열을 기반으로 로컬 스토리지용 고유 캐시 키를 생성합니다.
 */
export function createWeatherCacheKey(locationQuery: string) {
  return `${WEATHER_CACHE_PREFIX}:${locationQuery}`
}

/**
 * 브라우저 localStorage 인스턴스를 안전하게 반환합니다.
 * SSR 환경이나 스토리지 접근이 차단된 환경(시크릿 모드 등)에서는 null을 반환합니다.
 */
function getStorage() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * 전달받은 값이 유효한 WeatherState 구조를 가지는지 런타임에 검증하는 타입 가드입니다.
 * 11개의 모든 필수 키가 존재하고, 유한한 숫자인지 확인합니다.
 */
function isWeatherState(value: unknown): value is WeatherState {
  if (!value || typeof value !== 'object') return false

  return WEATHER_STATE_KEYS.every((key) => {
    const field = (value as Record<string, unknown>)[key]
    return typeof field === 'number' && Number.isFinite(field)
  })
}

/**
 * 로컬 스토리지에서 파싱한 객체가 유효한 WeatherCacheEntry 규격인지 검증하는 타입 가드입니다.
 * 캐시 스키마 버전, 수신 타임스탬프, 내부 weather 상태 객체를 모두 검사합니다.
 */
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

// ==========================================
// 3. 캐시 읽기/쓰기 (Cache I/O)
// ==========================================

/**
 * 로컬 스토리지에서 날씨 캐시 데이터를 조회합니다.
 * 오염되거나 버전이 맞지 않는 캐시는 자동으로 삭제하며 유효 여부를 계산합니다.
 *
 * @param locationQuery 위치 식별용 쿼리 문자열
 * @param now 기준 시각 타임스탬프
 * @returns 캐시 조회 결과 객체, 만약 데이터가 없거나 유효하지 않으면 null
 */
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

    const entry = JSON.parse(serialized)
    // 오염된 캐시를 발견하면 즉시 청소하고 null을 반환
    if (!isWeatherCacheEntry(entry)) {
      storage.removeItem(key)
      return null
    }

    // 시간 역전 현상이 발생해도 음수가 되지 않도록 0으로 보정
    const ageMs = Math.max(0, now - entry.fetchedAt)
    return {
      fetchedAt: entry.fetchedAt,
      ageMs,
      isFresh: ageMs <= WEATHER_CACHE_TTL_MS,
      weather: entry.weather,
    }
  } catch {
    // 모든 런타임 예외를 무시하고 안전하게 null 반환
    try {
      storage.removeItem(key)
    } catch {}
    return null
  }
}

/**
 * 날씨 데이터를 로컬 스토리지 캐시에 직렬화하여 저장합니다.
 *
 * @param locationQuery 위치 식별용 쿼리 문자열
 * @param weather 저장할 날씨 상태 데이터
 * @param fetchedAt 데이터 수신 시각 타임스탬프 (ms)
 * @returns 저장 성공 시 true, 스토리지 접근 불가/용량 초과 시 false
 */
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
