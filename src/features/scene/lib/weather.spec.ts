import { Color } from 'cesium'
import { describe, expect, it } from 'vitest'
import type { SceneWeatherState } from '../model/scene.types'
import {
  getPrecipitationMode,
  getSnowstormIntensity,
  getThunderstormIntensity,
  getWeatherTint,
} from './weather'

const baseState: SceneWeatherState = {
  time: 16.5,
  cloudCover: 35,
  precipitation: 0,
  aqi: 45,
  visibility: 15,
  temperature: 24.5,
  windSpeed: 5,
  windDirectionDegrees: 225,
  humidity: 62,
}

describe('scene 날씨 강도 계산', () => {
  it('강수량과 온도에 따라 강수 모드를 결정해야 한다', () => {
    expect(getPrecipitationMode(baseState)).toBeNull()
    expect(getPrecipitationMode({ ...baseState, precipitation: 1, temperature: 8 })).toBe('rain')
    expect(getPrecipitationMode({ ...baseState, precipitation: 1, temperature: -2 })).toBe('snow')
  })

  it('뇌우 강도는 비, 강수량, 운량, 습도가 모두 높을 때 커져야 한다', () => {
    expect(getThunderstormIntensity({ ...baseState, precipitation: 14, temperature: -2 })).toBe(0)
    expect(getThunderstormIntensity({ ...baseState, precipitation: 8 })).toBe(0)

    const intensity = getThunderstormIntensity({
      ...baseState,
      precipitation: 16,
      cloudCover: 100,
      humidity: 100,
    })

    expect(intensity).toBe(1)
  })

  it('눈보라 강도는 눈과 바람이 함께 강할 때 커져야 한다', () => {
    expect(getSnowstormIntensity({ ...baseState, precipitation: 8, temperature: 6 })).toBe(0)

    const intensity = getSnowstormIntensity({
      ...baseState,
      precipitation: 12,
      temperature: -3,
      windSpeed: 17,
      humidity: 100,
    })

    expect(intensity).toBeCloseTo(0.82)
  })

  it('날씨 색상은 Cesium Color로 반환되어야 한다', () => {
    const tint = getWeatherTint({ ...baseState, aqi: 180, time: 6 })

    expect(tint).toBeInstanceOf(Color)
    expect(tint.alpha).toBe(1)
  })
})
