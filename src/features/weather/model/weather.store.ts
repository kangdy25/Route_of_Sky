import { defineStore } from 'pinia'
import { ref } from 'vue'
import { defaultWeatherState } from './weather.constants'

/** 날씨 상태를 앱 레이아웃과 3D 씬이 함께 참조할 수 있도록 관리합니다. */
export const useWeatherStore = defineStore('weather', () => {
  const time = ref(defaultWeatherState.time)
  const temperature = ref(defaultWeatherState.temperature)
  const humidity = ref(defaultWeatherState.humidity)
  const windSpeed = ref(defaultWeatherState.windSpeed)
  const windDirectionDegrees = ref(defaultWeatherState.windDirectionDegrees)
  const aqi = ref(defaultWeatherState.aqi)
  const cloudCover = ref(defaultWeatherState.cloudCover)
  const precipitation = ref(defaultWeatherState.precipitation)
  const visibility = ref(defaultWeatherState.visibility)

  return {
    time,
    temperature,
    humidity,
    windSpeed,
    windDirectionDegrees,
    aqi,
    cloudCover,
    precipitation,
    visibility,
  }
})
