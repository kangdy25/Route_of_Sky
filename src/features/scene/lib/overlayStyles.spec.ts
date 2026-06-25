import { describe, expect, it } from 'vitest'
import type { SceneWeatherState } from '../model/scene.types'
import {
  getAtmosphereOverlayStyle,
  getMistOverlayStyle,
  getSkyTimeStyle,
  getTwilightCloudGlowStyle,
  getWhiteoutOverlayStyle,
} from './overlayStyles'

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

describe('scene DOM 오버레이 스타일', () => {
  it('대기 오버레이 배경 문자열을 계산해야 한다', () => {
    const style = getAtmosphereOverlayStyle({
      ...baseState,
      cloudCover: 100,
      precipitation: 16,
      aqi: 180,
      humidity: 100,
    })

    expect(style.background).toContain('radial-gradient')
    expect(style.background).toContain('linear-gradient')
  })

  it('미스트 오버레이는 낮은 가시거리와 강수량을 opacity와 blur로 반영해야 한다', () => {
    const style = getMistOverlayStyle({
      ...baseState,
      visibility: 2,
      precipitation: 12,
      aqi: 160,
    })

    expect(style.opacity).toBeGreaterThan(0)
    expect(style.backdropFilter).toContain('blur(')
  })

  it('눈보라 오버레이는 snowstorm 강도를 opacity와 saturate로 반영해야 한다', () => {
    const style = getWhiteoutOverlayStyle({
      ...baseState,
      precipitation: 12,
      temperature: -5,
      windSpeed: 17,
      humidity: 100,
    })

    expect(style.opacity).toBeGreaterThan(0)
    expect(style.backdropFilter).toContain('saturate(')
  })

  it('시간대 오버레이는 opacity와 그라디언트를 계산해야 한다', () => {
    const style = getSkyTimeStyle({ ...baseState, time: 6, cloudCover: 90 })

    expect(style.opacity).toBeGreaterThan(0)
    expect(style.background).toContain('linear-gradient')
  })

  it('노을 구름광은 황혼과 운량이 있을 때 표시되어야 한다', () => {
    const style = getTwilightCloudGlowStyle({ ...baseState, time: 19.95, cloudCover: 90 })

    expect(style.opacity).toBeGreaterThan(0)
    expect(style.background).toContain('radial-gradient')
  })
})
