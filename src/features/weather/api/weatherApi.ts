import type { WeatherState } from '@/features/weather/model/weather.types'

// ==========================================
// 1. 엔드포인트 및 기본 좌표 설정
// ==========================================
export const WEATHER_API_PROXY_ENDPOINT = '/api/weather'
export const DEFAULT_WEATHER_LOCATION_QUERY = '40.758,-73.9855' // 기본 좌표 (뉴욕 타임스퀘어)

type WeatherApiFetcher = typeof fetch

// ==========================================
// 2. WeatherAPI 원시 응답 인터페이스
// ==========================================

/** WeatherAPI가 반환하는 공기질(Air Quality) 데이터 페이로드입니다. */
interface WeatherApiAirQuality {
  pm2_5?: number
  'us-epa-index'?: number
}

/** WeatherAPI가 반환하는 실시간 기상 관측치 페이로드입니다. */
interface WeatherApiCurrent {
  temp_c: number
  humidity: number
  wind_kph: number
  wind_degree: number
  cloud: number
  precip_mm: number
  vis_km: number
  air_quality?: WeatherApiAirQuality
}

/** WeatherAPI 응답에 포함된 관측 위치 및 현지 시간 메타데이터입니다. */
interface WeatherApiLocation {
  localtime?: string
}

/** WeatherAPI 일별 예보 데이터 구조입니다. 당일 최저/최고 기온 추출에 사용됩니다. */
interface WeatherApiForecastDay {
  day?: {
    mintemp_c?: number
    maxtemp_c?: number
  }
}

/** WeatherAPI의 날씨 조회(Forecast/Current) 성공 시 수신되는 전체 JSON 응답 구조입니다. */
interface WeatherApiCurrentResponse {
  location: WeatherApiLocation
  current: WeatherApiCurrent
  forecast?: {
    forecastday?: WeatherApiForecastDay[]
  }
}

/** WeatherAPI 서버 또는 프록시에서 오류 발생 시 반환하는 JSON 에러 규격입니다. */
interface WeatherApiErrorResponse {
  error?: {
    code?: number
    message?: string
  }
}

// ==========================================
// 3. EPA AQI 기준치 테이블 및 유틸
// ==========================================

/** 미국 환경보호청(EPA) PM2.5 기준 AQI 구간 선형 보간 테이블 */
const EPA_PM25_BREAKPOINTS = [
  { concentrationLow: 0, concentrationHigh: 12, aqiLow: 0, aqiHigh: 50 },
  { concentrationLow: 12.1, concentrationHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
  { concentrationLow: 35.5, concentrationHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
  { concentrationLow: 55.5, concentrationHigh: 150.4, aqiLow: 151, aqiHigh: 200 },
  { concentrationLow: 150.5, concentrationHigh: 250.4, aqiLow: 201, aqiHigh: 300 },
  { concentrationLow: 250.5, concentrationHigh: 350.4, aqiLow: 301, aqiHigh: 400 },
  { concentrationLow: 350.5, concentrationHigh: 500.4, aqiLow: 401, aqiHigh: 500 },
]

/** EPA 6단계 인덱스(1~6)에 대응하는 대표 AQI 수치 매핑 */
const US_EPA_INDEX_TO_AQI = [25, 75, 125, 175, 250, 300] as const

/** 소수점 n자리 반올림 유틸 */
function roundTo(value: number, fractionDigits: number) {
  const multiplier = 10 ** fractionDigits

  return Math.round(value * multiplier) / multiplier
}

/** 최소/최대 범위 제한(Clamping) 유틸 */
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * 현지 시각 문자열("YYYY-MM-DD HH:mm")에서 시간을 추출하여 0~23.98 범위의 실수로 변환합니다.
 * 파싱 실패 시 낮 12시(12.0)를 기본값으로 반환합니다.
 */
function parseLocalWeatherHour(localtime?: string) {
  const timeMatch = localtime?.match(/\b(\d{1,2}):(\d{2})\b/)

  if (!timeMatch) {
    return 12
  }

  const hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])

  // 24.0 도달 시 3D 조명이 급격히 점프하는 현상을 방지하기 위해 최대 23.98로 클램핑
  return clamp(hours + minutes / 60, 0, 23.98)
}

/** PM2.5 농도(ug/m3)를 미국 EPA 표준 수식을 통해 0~500 범위의 AQI로 변환합니다. */
function convertPm25ToUsAqi(pm25?: number) {
  if (typeof pm25 !== 'number' || Number.isNaN(pm25)) {
    return undefined
  }

  // EPA 규정에 따라 PM2.5 농도는 소수점 첫째 자리까지 절사
  const normalizedPm25 = Math.trunc(pm25 * 10) / 10

  // 해당 농도가 속하는 기준 구간(Breakpoint) 탐색
  const breakpoint =
    EPA_PM25_BREAKPOINTS.find(
      ({ concentrationLow, concentrationHigh }) =>
        normalizedPm25 >= concentrationLow && normalizedPm25 <= concentrationHigh,
    ) ?? EPA_PM25_BREAKPOINTS[EPA_PM25_BREAKPOINTS.length - 1]

  // EPA 표준 선형 방정식 계산
  const aqi =
    ((breakpoint.aqiHigh - breakpoint.aqiLow) /
      (breakpoint.concentrationHigh - breakpoint.concentrationLow)) *
      (normalizedPm25 - breakpoint.concentrationLow) +
    breakpoint.aqiLow

  return Math.round(clamp(aqi, 0, 500))
}

/** PM2.5 미제공 시 us-epa-index(1~6) 값을 대표 AQI 수치로 매핑합니다. */
function convertUsEpaIndexToAqi(usEpaIndex?: number) {
  if (typeof usEpaIndex !== 'number') {
    return 45
  }

  return US_EPA_INDEX_TO_AQI[clamp(Math.round(usEpaIndex), 1, 6) - 1]
}

/** 위치 쿼리를 포함한 프록시 API 호출 URL 생성 */
function createWeatherApiUrl(locationQuery: string) {
  const searchParams = new URLSearchParams({ q: locationQuery })

  return `${WEATHER_API_PROXY_ENDPOINT}?${searchParams.toString()}`
}

/** fetchCurrentWeather 호출 시 전달 가능한 비동기 옵션 객체입니다. */
export interface FetchCurrentWeatherOptions {
  fetcher?: WeatherApiFetcher
  signal?: AbortSignal
}

/** 위도/경도를 WeatherAPI 표준 위치 쿼리 형식("lat,lng")으로 조합 */
export function createWeatherLocationQuery(latitude: number, longitude: number) {
  return `${latitude},${longitude}`
}

// ==========================================
// 4. 응답 매핑 및 네트워크 요청 액션
// ==========================================

/**
 * WeatherAPI 원시 응답 데이터를 애플리케이션 표준 WeatherState 규격으로 정규화합니다.
 * 단위 변환(km/h -> m/s), 결측치 폴백, 수치 범위 클램핑을 수행합니다.
 *
 * @param response WeatherAPI 원시 응답 객체
 * @returns 3D 씬 및 스토어에 바인딩 가능한 상태 객체
 */
export function mapWeatherApiCurrentResponse(response: WeatherApiCurrentResponse): WeatherState {
  const { current, location } = response
  // 당일 예보 객체 추출 (forecastday 배열의 첫 번째 항목)
  const forecastDay = response.forecast?.forecastday?.[0]?.day
  const temperature = roundTo(current.temp_c, 1)

  return {
    time: roundTo(parseLocalWeatherHour(location.localtime), 2),
    temperature,
    temperatureMin: roundTo(forecastDay?.mintemp_c ?? temperature, 1),
    temperatureMax: roundTo(forecastDay?.maxtemp_c ?? temperature, 1),
    humidity: clamp(Math.round(current.humidity), 0, 100),
    windSpeed: roundTo(current.wind_kph / 3.6, 1),
    windDirectionDegrees: clamp(Math.round(current.wind_degree), 0, 360),
    aqi:
      convertPm25ToUsAqi(current.air_quality?.pm2_5) ??
      convertUsEpaIndexToAqi(current.air_quality?.['us-epa-index']),
    cloudCover: clamp(Math.round(current.cloud), 0, 100),
    precipitation: roundTo(current.precip_mm, 1),
    visibility: roundTo(current.vis_km, 1),
  }
}

/**
 * 프록시 엔드포인트를 통해 실시간 날씨 정보를 비동기 요청하고 가공하여 반환합니다.
 *
 * @param locationQuery 위도/경도 문자열("lat,lng") 또는 지역 식별자 (기본값: 뉴욕 타임스퀘어)
 * @param options 네트워크 커스텀 fetcher 및 AbortSignal 취소 토큰
 * @returns 정규화된 WeatherState 객체
 * @throws 네트워크 실패, HTTP 상태 이상, 비정상 페이로드 수신 시 에러 throw
 */
export async function fetchCurrentWeather(
  locationQuery = DEFAULT_WEATHER_LOCATION_QUERY,
  options: FetchCurrentWeatherOptions = {},
) {
  // 요청 URL 빌드 및 실제 HTTP 요청 수행
  const response = await (options.fetcher ?? fetch)(
    createWeatherApiUrl(locationQuery),
    options.signal ? { signal: options.signal } : undefined,
  )
  // 성공하지 못했으면 JSON 파싱을 아예 시도하지 않고 즉시 에러 발생
  if (!response.ok) {
    throw new Error(`날씨 정보를 가져오지 못했습니다. (HTTP ${response.status})`)
  }

  // 200 OK 상태일 때만 안전하게 JSON 파싱
  const payload = (await response.json()) as WeatherApiCurrentResponse & WeatherApiErrorResponse

  return mapWeatherApiCurrentResponse(payload)
}
