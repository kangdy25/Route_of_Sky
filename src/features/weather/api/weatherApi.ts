import type { WeatherState } from '@/features/weather/model/weather.types'

export const WEATHER_API_CURRENT_ENDPOINT = 'https://api.weatherapi.com/v1/current.json'
export const WEATHER_API_FORECAST_ENDPOINT = 'https://api.weatherapi.com/v1/forecast.json'
export const DEFAULT_WEATHER_LOCATION_QUERY = '40.758,-73.9855'

type WeatherApiFetcher = typeof fetch

interface WeatherApiAirQuality {
  pm2_5?: number
  'us-epa-index'?: number
}

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

interface WeatherApiLocation {
  localtime?: string
}

interface WeatherApiForecastDay {
  day?: {
    mintemp_c?: number
    maxtemp_c?: number
  }
}

interface WeatherApiCurrentResponse {
  location: WeatherApiLocation
  current: WeatherApiCurrent
  forecast?: {
    forecastday?: WeatherApiForecastDay[]
  }
}

interface WeatherApiErrorResponse {
  error?: {
    code?: number
    message?: string
  }
}

const EPA_PM25_BREAKPOINTS = [
  { concentrationLow: 0, concentrationHigh: 12, aqiLow: 0, aqiHigh: 50 },
  { concentrationLow: 12.1, concentrationHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
  { concentrationLow: 35.5, concentrationHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
  { concentrationLow: 55.5, concentrationHigh: 150.4, aqiLow: 151, aqiHigh: 200 },
  { concentrationLow: 150.5, concentrationHigh: 250.4, aqiLow: 201, aqiHigh: 300 },
  { concentrationLow: 250.5, concentrationHigh: 350.4, aqiLow: 301, aqiHigh: 400 },
  { concentrationLow: 350.5, concentrationHigh: 500.4, aqiLow: 401, aqiHigh: 500 },
]

const US_EPA_INDEX_TO_AQI = [25, 75, 125, 175, 250, 300] as const

function roundTo(value: number, fractionDigits: number) {
  const multiplier = 10 ** fractionDigits

  return Math.round(value * multiplier) / multiplier
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function parseLocalWeatherHour(localtime?: string) {
  const timeMatch = localtime?.match(/\b(\d{1,2}):(\d{2})\b/)

  if (!timeMatch) {
    return 12
  }

  const hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])

  return clamp(hours + minutes / 60, 0, 23.98)
}

function convertPm25ToUsAqi(pm25?: number) {
  if (typeof pm25 !== 'number' || Number.isNaN(pm25)) {
    return undefined
  }

  const normalizedPm25 = Math.trunc(pm25 * 10) / 10
  const breakpoint =
    EPA_PM25_BREAKPOINTS.find(
      ({ concentrationLow, concentrationHigh }) =>
        normalizedPm25 >= concentrationLow && normalizedPm25 <= concentrationHigh,
    ) ?? EPA_PM25_BREAKPOINTS[EPA_PM25_BREAKPOINTS.length - 1]

  const aqi =
    ((breakpoint.aqiHigh - breakpoint.aqiLow) /
      (breakpoint.concentrationHigh - breakpoint.concentrationLow)) *
      (normalizedPm25 - breakpoint.concentrationLow) +
    breakpoint.aqiLow

  return Math.round(clamp(aqi, 0, 500))
}

function convertUsEpaIndexToAqi(usEpaIndex?: number) {
  if (typeof usEpaIndex !== 'number') {
    return 45
  }

  return US_EPA_INDEX_TO_AQI[clamp(Math.round(usEpaIndex), 1, 6) - 1]
}

function createWeatherApiUrl(apiKey: string, locationQuery: string) {
  const url = new URL(WEATHER_API_FORECAST_ENDPOINT)

  url.searchParams.set('key', apiKey)
  url.searchParams.set('q', locationQuery)
  url.searchParams.set('days', '1')
  url.searchParams.set('aqi', 'yes')

  return url
}

export function createWeatherLocationQuery(latitude: number, longitude: number) {
  return `${latitude},${longitude}`
}

export function mapWeatherApiCurrentResponse(response: WeatherApiCurrentResponse): WeatherState {
  const { current, location } = response
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

export async function fetchCurrentWeather(
  apiKey: string,
  locationQuery = DEFAULT_WEATHER_LOCATION_QUERY,
  fetcher: WeatherApiFetcher = fetch,
) {
  const response = await fetcher(createWeatherApiUrl(apiKey, locationQuery))
  const payload = (await response.json()) as WeatherApiCurrentResponse & WeatherApiErrorResponse

  if (!response.ok) {
    throw new Error(payload.error?.message || 'WeatherAPI 요청에 실패했습니다.')
  }

  const weather = mapWeatherApiCurrentResponse(payload)

  return weather
}
