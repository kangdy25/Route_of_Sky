import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultWeatherState } from './weather.constants'
import { useWeatherStore } from './weather.store'

describe('날씨 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('기본 날씨 상태로 초기화되어야 한다', () => {
    const store = useWeatherStore()

    expect(store.time).toBe(defaultWeatherState.time)
    expect(store.temperature).toBe(defaultWeatherState.temperature)
    expect(store.humidity).toBe(defaultWeatherState.humidity)
    expect(store.windSpeed).toBe(defaultWeatherState.windSpeed)
    expect(store.windDirectionDegrees).toBe(defaultWeatherState.windDirectionDegrees)
    expect(store.aqi).toBe(defaultWeatherState.aqi)
    expect(store.cloudCover).toBe(defaultWeatherState.cloudCover)
    expect(store.precipitation).toBe(defaultWeatherState.precipitation)
    expect(store.visibility).toBe(defaultWeatherState.visibility)
  })

  it('날씨 상태 값을 갱신할 수 있어야 한다', () => {
    const store = useWeatherStore()

    store.temperature = -4
    store.precipitation = 5.5
    store.visibility = 3

    expect(store.temperature).toBe(-4)
    expect(store.precipitation).toBe(5.5)
    expect(store.visibility).toBe(3)
  })
})
