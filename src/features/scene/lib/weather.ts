import { Color, Math as CesiumMath } from 'cesium'

import {
  PRECIPITATION_MODE_THRESHOLD,
  THUNDERSTORM_PRECIPITATION_THRESHOLD,
} from '../model/scene.constants'
import type { PrecipitationMode, SceneWeatherState } from '../model/scene.types'
import { clamp01, smoothstep } from './math'
import { getSkyPhase } from './sky'

export function getPrecipitationMode(state: SceneWeatherState): PrecipitationMode {
  if (state.precipitation <= PRECIPITATION_MODE_THRESHOLD) return null
  return state.temperature <= 0 ? 'snow' : 'rain'
}

export function getThunderstormIntensity(state: SceneWeatherState) {
  if (getPrecipitationMode(state) !== 'rain') return 0
  if (state.precipitation < THUNDERSTORM_PRECIPITATION_THRESHOLD) return 0

  const precipitationFactor = CesiumMath.lerp(
    0.34,
    1,
    clamp01((state.precipitation - THUNDERSTORM_PRECIPITATION_THRESHOLD) / 4),
  )
  const cloudFactor = CesiumMath.lerp(0.55, 1, clamp01((state.cloudCover - 55) / 45))
  const humidityFactor = CesiumMath.lerp(0.72, 1, clamp01((state.humidity - 55) / 45))

  return clamp01(precipitationFactor * cloudFactor * humidityFactor)
}

export function getSnowstormIntensity(state: SceneWeatherState) {
  if (getPrecipitationMode(state) !== 'snow') return 0

  const snowfallFactor = smoothstep(5.5, 12, state.precipitation)
  const windFactor = smoothstep(7, 17, state.windSpeed)
  const humidityFactor = CesiumMath.lerp(0.72, 1, clamp01((state.humidity - 55) / 45))

  return clamp01(snowfallFactor * windFactor * humidityFactor * 0.82)
}

export function getWeatherTint(state: SceneWeatherState) {
  const sky = getSkyPhase(state.time)
  const dawnWarmth = sky.dawn + sky.dusk
  const dustFactor = clamp01((state.aqi - 55) / 210)
  const clearRed = CesiumMath.lerp(0.58, 0.96, dawnWarmth)
  const clearGreen = CesiumMath.lerp(0.66, 0.82, sky.daylight) + dawnWarmth * 0.05
  const clearBlue = CesiumMath.lerp(0.76, 0.92, sky.daylight) - dawnWarmth * 0.18
  const red = CesiumMath.lerp(clearRed, 0.78, dustFactor)
  const green = CesiumMath.lerp(clearGreen, 0.58, dustFactor)
  const blue = CesiumMath.lerp(clearBlue, 0.34, dustFactor)

  return new Color(red, green, blue, 1)
}
