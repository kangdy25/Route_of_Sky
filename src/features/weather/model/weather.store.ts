import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchCurrentWeather } from '@/features/weather/api/weatherApi'
import { hasWeatherApiKey, weatherApiKey } from '@/shared/config/env'
import { defaultWeatherState } from './weather.constants'
import type { WeatherState } from './weather.types'

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

  async function loadCurrentWeather(locationQuery?: string, fetcher: typeof fetch = fetch) {
    if (!hasWeatherApiKey) {
      return false
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      applyWeatherState(await fetchCurrentWeather(weatherApiKey, locationQuery, fetcher))
      lastUpdatedAt.value = Date.now()

      return true
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '실시간 날씨 정보를 불러오지 못했습니다.'

      return false
    } finally {
      isLoading.value = false
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
    applyWeatherState,
    loadCurrentWeather,
  }
})
