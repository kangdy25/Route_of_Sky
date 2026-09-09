import { describe, expect, it, vi } from 'vitest'
import { createWeatherLocationQuery, fetchCurrentWeather, mapWeatherApiCurrentResponse } from './weatherApi'

describe('WeatherAPI 클라이언트', () => {
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

  it('localtime과 대기질 정보가 없으면 기본 시간과 AQI를 사용해야 한다', () => {
    const weather = mapWeatherApiCurrentResponse({
      location: {},
      current: {
        temp_c: 12,
        humidity: 48,
        wind_kph: 0,
        wind_degree: 0,
        cloud: 20,
        precip_mm: 0,
        vis_km: 16,
      },
    })

    expect(weather.time).toBe(12)
    expect(weather.aqi).toBe(45)
    expect(weather.temperatureMin).toBe(12)
    expect(weather.temperatureMax).toBe(12)
  })

  it('PM2.5가 AQI 표 범위를 넘으면 마지막 구간으로 제한해야 한다', () => {
    const weather = mapWeatherApiCurrentResponse({
      location: { localtime: '2026-06-26 12:00' },
      current: {
        temp_c: 12,
        humidity: 48,
        wind_kph: 0,
        wind_degree: 0,
        cloud: 20,
        precip_mm: 0,
        vis_km: 16,
        air_quality: { pm2_5: 700 },
      },
    })

    expect(weather.aqi).toBe(500)
  })

  it('좌표를 WeatherAPI 위치 쿼리로 변환해야 한다', () => {
    expect(createWeatherLocationQuery(37.5512, 126.9882)).toBe('37.5512,126.9882')
  })

  it('현재 날씨를 동일 출처 프록시로 호출해야 한다', async () => {
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

    await fetchCurrentWeather('Seoul', { fetcher })

    const requestUrl = new URL(fetcher.mock.calls[0][0] as string, 'https://routeofsky.test')

    expect(requestUrl.origin).toBe('https://routeofsky.test')
    expect(requestUrl.pathname).toBe('/api/weather')
    expect(requestUrl.searchParams.get('q')).toBe('Seoul')
    expect(requestUrl.searchParams.has('key')).toBe(false)
  })

  it('요청 취소 signal을 fetch에 전달해야 한다', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          location: {},
          current: {
            temp_c: 20,
            humidity: 50,
            wind_kph: 0,
            wind_degree: 0,
            cloud: 0,
            precip_mm: 0,
            vis_km: 20,
          },
        }),
    })

    await fetchCurrentWeather('Seoul', { fetcher, signal: controller.signal })

    expect(fetcher).toHaveBeenCalledWith('/api/weather?q=Seoul', { signal: controller.signal })
  })

  it('강제 갱신도 공개 CDN 우회 파라미터를 전송하지 않아야 한다', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          location: {},
          current: {
            temp_c: 20,
            humidity: 50,
            wind_kph: 0,
            wind_degree: 0,
            cloud: 0,
            precip_mm: 0,
            vis_km: 20,
          },
        }),
    })

    await fetchCurrentWeather('Seoul', { fetcher })

    expect(fetcher).toHaveBeenCalledWith('/api/weather?q=Seoul', undefined)
  })

  it('HTTP 오류 응답이면 원본 오류 메시지 대신 상태 코드로 실패해야 한다', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'API key is invalid.' } }),
    })

    await expect(fetchCurrentWeather('Seoul', { fetcher })).rejects.toThrow(
      '날씨 정보를 가져오지 못했습니다. (HTTP 401)',
    )
  })

  it('HTTP 오류 응답에 메시지가 없어도 상태 코드로 실패해야 한다', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({}),
    })

    await expect(fetchCurrentWeather('Seoul', { fetcher })).rejects.toThrow(
      '날씨 정보를 가져오지 못했습니다. (HTTP 502)',
    )
  })
})
