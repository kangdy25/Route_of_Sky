import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWeatherLocationQuery,
  fetchCurrentWeather,
  mapWeatherApiCurrentResponse,
} from './weatherApi'

const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

describe('WeatherAPI 클라이언트', () => {
  beforeEach(() => {
    consoleInfoSpy.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('WeatherAPI 현재 날씨 응답을 앱 날씨 상태로 변환해야 한다', () => {
    const weather = mapWeatherApiCurrentResponse({
      location: { localtime: '2026-06-26 14:30' },
      current: {
        temp_c: 21.86,
        humidity: 64,
        wind_kph: 18,
        wind_degree: 227,
        cloud: 42,
        precip_mm: 1.24,
        vis_km: 9.8,
        air_quality: {
          pm2_5: 22.8,
          'us-epa-index': 2,
        },
      },
      forecast: {
        forecastday: [{ day: { mintemp_c: 17.22, maxtemp_c: 29.84 } }],
      },
    })

    expect(weather).toEqual({
      time: 14.5,
      temperature: 21.9,
      temperatureMin: 17.2,
      temperatureMax: 29.8,
      humidity: 64,
      windSpeed: 5,
      windDirectionDegrees: 227,
      aqi: 74,
      cloudCover: 42,
      precipitation: 1.2,
      visibility: 9.8,
    })
  })

  it('PM2.5가 없으면 WeatherAPI US EPA 등급을 대표 AQI로 변환해야 한다', () => {
    const weather = mapWeatherApiCurrentResponse({
      location: { localtime: '2026-06-26 07:00' },
      current: {
        temp_c: 18,
        humidity: 55,
        wind_kph: 7.2,
        wind_degree: 15,
        cloud: 8,
        precip_mm: 0,
        vis_km: 20,
        air_quality: {
          'us-epa-index': 4,
        },
      },
    })

    expect(weather.aqi).toBe(175)
  })

  it('좌표를 WeatherAPI 위치 쿼리로 변환해야 한다', () => {
    expect(createWeatherLocationQuery(37.5512, 126.9882)).toBe('37.5512,126.9882')
  })

  it('현재 날씨 API를 aqi=yes 옵션으로 호출해야 한다', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          location: { localtime: '2026-06-26 19:15' },
          current: {
            temp_c: 25,
            humidity: 70,
            wind_kph: 3.6,
            wind_degree: 90,
            cloud: 30,
            precip_mm: 0,
            vis_km: 12,
            air_quality: { pm2_5: 5 },
          },
          forecast: {
            forecastday: [{ day: { mintemp_c: 19, maxtemp_c: 28 } }],
          },
        }),
    })

    await fetchCurrentWeather('test-key', 'Seoul', fetcher)

    const requestUrl = fetcher.mock.calls[0][0] as URL

    expect(requestUrl.searchParams.get('key')).toBe('test-key')
    expect(requestUrl.searchParams.get('q')).toBe('Seoul')
    expect(requestUrl.searchParams.get('days')).toBe('1')
    expect(requestUrl.searchParams.get('aqi')).toBe('yes')
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[WeatherAPI] Current weather fetch succeeded',
      expect.objectContaining({ query: 'Seoul' }),
    )
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[WeatherAPI] Raw current weather response',
      expect.objectContaining({ location: expect.any(Object), current: expect.any(Object) }),
    )
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[WeatherAPI] Mapped weather state',
      expect.objectContaining({ temperature: 25, humidity: 70 }),
    )
  })

  it('WeatherAPI 오류 응답이면 메시지를 포함해 실패해야 한다', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'API key is invalid.' } }),
    })

    await expect(fetchCurrentWeather('bad-key', 'Seoul', fetcher)).rejects.toThrow(
      'API key is invalid.',
    )
  })
})
