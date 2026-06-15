import type { WeatherState } from './weather.types'

/** API 연동 전까지 대시보드와 씬을 구동하는 기본 날씨 상태입니다. */
export const defaultWeatherState: WeatherState = {
  time: 16.5,
  temperature: 24.5,
  humidity: 62,
  windSpeed: 5,
  aqi: 45,
  cloudCover: 65,
  precipitation: 0.0,
  visibility: 15.0,
}
