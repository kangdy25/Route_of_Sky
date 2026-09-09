import { Color, Math as CesiumMath } from 'cesium'

import { PRECIPITATION_MODE_THRESHOLD, THUNDERSTORM_PRECIPITATION_THRESHOLD } from '../model/scene.constants'
import type { PrecipitationMode, SceneWeatherState, SkyPhase } from '../model/scene.types'
import { clampToUnitInterval, smoothstep } from './math'
import { getSkyPhase } from './sky'

/** GC 방지용 내부 전용 SkyPhase 버퍼 */
const weatherSkyPhaseScratch: SkyPhase = {
  dawn: 0,
  daylight: 0,
  sunset: 0,
  night: 0,
  horizonGlow: 0,
}

/** getWeatherTint 기본 반환용 재사용 버퍼 (매 프레임 Color 객체 힙 할당 차단) */
const defaultWeatherTintScratch = new Color()

/** 현재 기상 상태의 강수량과 기온을 평가하여 화면에 렌더링할 강수 파티클 유형(눈, 비)을 결정합니다. */
export function getPrecipitationMode(state: SceneWeatherState): PrecipitationMode {
  if (state.precipitation <= PRECIPITATION_MODE_THRESHOLD) return null
  return state.temperature <= 0 ? 'snow' : 'rain'
}

/** 강수량, 운량, 습도를 결합하여 뇌우 시각 효과 강도를 산출합니다. */
export function getThunderstormIntensity(state: SceneWeatherState) {
  if (getPrecipitationMode(state) !== 'rain') return 0
  if (state.precipitation < THUNDERSTORM_PRECIPITATION_THRESHOLD) return 0

  // 강수량: 임계치 진입 즉시 시각 효과가 켜지도록 최소 시작값(0.34)을 두고 16mm/h까지 보간
  const precipitationFactor = CesiumMath.lerp(
    0.34,
    1,
    clampToUnitInterval((state.precipitation - THUNDERSTORM_PRECIPITATION_THRESHOLD) / 4),
  )
  // 운량, 습도: 짙은 구름과 고습도(55% 초과 구간) 조건을 반영
  const cloudFactor = CesiumMath.lerp(0.55, 1, clampToUnitInterval((state.cloudCover - 55) / 45))
  const humidityFactor = CesiumMath.lerp(0.72, 1, clampToUnitInterval((state.humidity - 55) / 45))

  // 세 조건을 곱해 최종 폭풍 강도 산출 (진입 시 최소 강도 약 0.134 보장)
  return clampToUnitInterval(precipitationFactor * cloudFactor * humidityFactor)
}

/** 강설량, 풍속, 습도를 결합하여 눈보라 안개 시각 효과 강도를 산출합니다. */
export function getSnowstormIntensity(state: SceneWeatherState) {
  if (getPrecipitationMode(state) !== 'snow') return 0

  // 강설량, 풍속: smoothstep을 통해 임계 구간 진입 시 부드러운 S-Curve로 증폭
  const snowfallFactor = smoothstep(5.5, 12, state.precipitation)
  const windFactor = smoothstep(7, 17, state.windSpeed)
  // 습도: 55% 초과 구간부터 시야 감쇄율 가중
  const humidityFactor = CesiumMath.lerp(0.72, 1, clampToUnitInterval((state.humidity - 55) / 45))

  // 건물/지형 실루엣이 완전히 가려지지 않도록 최대 강도를 0.82로 제한
  return clampToUnitInterval(snowfallFactor * windFactor * humidityFactor * 0.82)
}

/** 시간대와 대기질 지수(AQI)를 반영한 대기 및 안개 틴트 색상을 산출합니다. */
export function getWeatherTint(state: SceneWeatherState, result: Color = defaultWeatherTintScratch) {
  const sky = getSkyPhase(state.time, weatherSkyPhaseScratch)

  // 새벽·일몰의 붉은 노을빛과 한낮의 푸른빛 비율을 계산해 맑은 날 기본 바탕색 생성
  const dawnWarmth = sky.dawn + sky.sunset
  const clearRed = CesiumMath.lerp(0.58, 0.96, dawnWarmth)
  const clearGreen = CesiumMath.lerp(0.66, 0.82, sky.daylight) + dawnWarmth * 0.05
  const clearBlue = CesiumMath.lerp(0.76, 0.92, sky.daylight) - dawnWarmth * 0.18

  // 미세먼지(AQI 55 초과) 유입 시 탁한 황갈색 스모그 톤으로 보간
  const dustFactor = clampToUnitInterval((state.aqi - 55) / 210)
  result.red = CesiumMath.lerp(clearRed, 0.78, dustFactor)
  result.green = CesiumMath.lerp(clearGreen, 0.58, dustFactor)
  result.blue = CesiumMath.lerp(clearBlue, 0.34, dustFactor)
  result.alpha = 1.0

  return result
}
