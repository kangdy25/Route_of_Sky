import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/config/env', () => ({
  weatherApiKey: '',
  hasWeatherApiKey: false,
}))

vi.mock('@/features/weather/api/weatherApi', () => ({
  fetchCurrentWeather: vi.fn(),
}))

import { fetchCurrentWeather } from '@/features/weather/api/weatherApi'
import { useWeatherStore } from './weather.store'

const mockedFetchCurrentWeather = vi.mocked(fetchCurrentWeather)

describe('날씨 store API 키 없음', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('날씨 API 키가 없으면 현재 날씨를 호출하지 않아야 한다', async () => {
    const store = useWeatherStore()

    await expect(store.loadCurrentWeather('37.5512,126.9882')).resolves.toBe(false)

    expect(mockedFetchCurrentWeather).not.toHaveBeenCalled()
    expect(store.isLoading).toBe(false)
    expect(store.errorMessage).toBe('')
  })
})
