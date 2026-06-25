import { Color, Math as CesiumMath } from 'cesium'

import {
  PRECIPITATION_MODE_THRESHOLD,
  THUNDERSTORM_PRECIPITATION_THRESHOLD,
} from '../model/scene.constants'
import type { PrecipitationMode, SceneWeatherState } from '../model/scene.types'
import { clampToUnitInterval, smoothstep } from './math'
import { getSkyPhase } from './sky'

// 날씨 상태를 화면 효과에서 바로 쓸 수 있는 강도 값으로 정규화합니다.
// 반환값은 대부분 0..1 범위라 오버레이, 구름, 후처리에서 함께 사용하기 좋습니다.
export function getPrecipitationMode(state: SceneWeatherState): PrecipitationMode {
  if (state.precipitation <= PRECIPITATION_MODE_THRESHOLD) return null
  return state.temperature <= 0 ? 'snow' : 'rain'
}

export function getThunderstormIntensity(state: SceneWeatherState) {
  if (getPrecipitationMode(state) !== 'rain') return 0
  if (state.precipitation < THUNDERSTORM_PRECIPITATION_THRESHOLD) return 0

  // 강수량만으로 뇌우를 만들지 않고 운량/습도까지 곱해 폭풍 조건을 좁힙니다.
  const precipitationFactor = CesiumMath.lerp(
    0.34,
    1,
    clampToUnitInterval((state.precipitation - THUNDERSTORM_PRECIPITATION_THRESHOLD) / 4),
  )
  const cloudFactor = CesiumMath.lerp(0.55, 1, clampToUnitInterval((state.cloudCover - 55) / 45))
  const humidityFactor = CesiumMath.lerp(0.72, 1, clampToUnitInterval((state.humidity - 55) / 45))

  return clampToUnitInterval(precipitationFactor * cloudFactor * humidityFactor)
}

export function getSnowstormIntensity(state: SceneWeatherState) {
  if (getPrecipitationMode(state) !== 'snow') return 0

  // 눈보라는 눈의 양보다 바람이 함께 강해질 때 화면 whiteout 효과가 커지도록 조합합니다.
  const snowfallFactor = smoothstep(5.5, 12, state.precipitation)
  const windFactor = smoothstep(7, 17, state.windSpeed)
  const humidityFactor = CesiumMath.lerp(0.72, 1, clampToUnitInterval((state.humidity - 55) / 45))

  return clampToUnitInterval(snowfallFactor * windFactor * humidityFactor * 0.82)
}

export function getWeatherTint(state: SceneWeatherState) {
  const sky = getSkyPhase(state.time)
  const dawnWarmth = sky.dawn + sky.dusk
  const dustFactor = clampToUnitInterval((state.aqi - 55) / 210)
  const clearRed = CesiumMath.lerp(0.58, 0.96, dawnWarmth)
  const clearGreen = CesiumMath.lerp(0.66, 0.82, sky.daylight) + dawnWarmth * 0.05
  const clearBlue = CesiumMath.lerp(0.76, 0.92, sky.daylight) - dawnWarmth * 0.18
  const red = CesiumMath.lerp(clearRed, 0.78, dustFactor)
  const green = CesiumMath.lerp(clearGreen, 0.58, dustFactor)
  const blue = CesiumMath.lerp(clearBlue, 0.34, dustFactor)

  // Cesium Color를 반환해 fog, cloud, background 계산에서 변환 없이 공유합니다.
  return new Color(red, green, blue, 1)
}
