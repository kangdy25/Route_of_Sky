import type { WeatherState } from './weather.types'

/** API 연동 전까지 UI와 3D 씬을 안정적으로 초기 렌더링하기 위한 예시 날씨값입니다. */
export const defaultWeatherState: WeatherState = {
  time: 16.5,
  temperature: 24.5,
  temperatureMin: -8,
  temperatureMax: 34,
  humidity: 62,
  windSpeed: 5,
  windDirectionDegrees: 225,
  aqi: 45,
  cloudCover: 35,
  precipitation: 0.0,
  visibility: 15.0,
}
