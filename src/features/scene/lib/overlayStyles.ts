import { Math as CesiumMath } from 'cesium'

import type { LensDroplet, SceneWeatherState } from '../model/scene.types'
import { clamp01 } from './math'
import { getSkyPhase } from './sky'
import { getPrecipitationMode, getSnowstormIntensity, getThunderstormIntensity } from './weather'

export function getAtmosphereOverlayStyle(state: SceneWeatherState) {
  const sky = getSkyPhase(state.time)
  const cloudAlpha = Math.min(0.34, Math.max(0.04, state.cloudCover / 280))
  const rainAlpha = Math.min(0.22, Math.max(0, state.precipitation / 360))
  const stormAlpha = getThunderstormIntensity(state) * 0.32
  const hazeAlpha = Math.min(0.28, Math.max(0.02, (20 - state.visibility) / 80 + state.aqi / 900))
  const dustAlpha = CesiumMath.lerp(0, 0.2, clamp01((state.aqi - 80) / 180))
  const dimFactor = CesiumMath.lerp(0.92, 0.42, sky.daylight)

  return {
    background: `radial-gradient(circle at 50% 35%, rgba(34, 211, 238, ${0.04 + sky.daylight * 0.04}), rgba(2, 6, 23, ${0.16 * dimFactor}) 52%, rgba(2, 6, 23, ${0.48 * dimFactor}) 100%), linear-gradient(180deg, rgba(15, 23, 42, ${stormAlpha}) 0%, rgba(30, 41, 59, ${stormAlpha * 0.62}) 45%, rgba(2, 6, 23, ${stormAlpha * 0.86}) 100%), linear-gradient(180deg, rgba(120, 86, 28, ${dustAlpha * 0.55}) 0%, rgba(161, 98, 7, ${dustAlpha}) 58%, rgba(92, 64, 24, ${dustAlpha * 0.75}) 100%), linear-gradient(180deg, rgba(15, 23, 42, ${cloudAlpha * dimFactor}) 0%, rgba(8, 13, 25, ${(rainAlpha + 0.12) * dimFactor}) 52%, rgba(2, 6, 23, ${(hazeAlpha + 0.2) * dimFactor}) 100%)`,
  }
}

export function getMistOverlayStyle(state: SceneWeatherState) {
  const sky = getSkyPhase(state.time)
  const visibilityMist = clamp01((12 - state.visibility) / 10)
  const aqiMist = clamp01((state.aqi - 80) / 180)
  const precipitationMist = clamp01(state.precipitation / 18) * 0.38
  const mistStrength = clamp01(visibilityMist + aqiMist * 0.46 + precipitationMist)
  const nightBoost = CesiumMath.lerp(1.18, 0.82, sky.daylight)
  const opacity = mistStrength * nightBoost
  const lowerMist = CesiumMath.lerp(0.08, 0.42, opacity)
  const horizonMist = CesiumMath.lerp(0.02, 0.24, opacity)

  return {
    opacity,
    background: `radial-gradient(ellipse at 50% 82%, rgba(226, 232, 240, ${lowerMist}), rgba(148, 163, 184, ${horizonMist}) 34%, transparent 68%), linear-gradient(180deg, transparent 0%, rgba(203, 213, 225, ${horizonMist * 0.52}) 42%, rgba(148, 163, 184, ${lowerMist}) 100%)`,
    backdropFilter: `blur(${CesiumMath.lerp(0, 2.8, mistStrength)}px)`,
  }
}

export function getWetLensIntensity(state: SceneWeatherState) {
  if (getPrecipitationMode(state) !== 'rain') return 0

  const rainFactor = clamp01((state.precipitation - 4.5) / 9)
  const humidityFactor = CesiumMath.lerp(0.82, 1.2, clamp01((state.humidity - 45) / 55))
  const stormBoost = getThunderstormIntensity(state) * 0.36

  return clamp01(rainFactor * humidityFactor + stormBoost)
}

export function getWetLensOverlayStyle(state: SceneWeatherState) {
  const intensity = getWetLensIntensity(state)

  return {
    opacity: intensity,
    background: `radial-gradient(circle at 12% 20%, rgba(226, 232, 240, ${0.16 * intensity}), transparent 20%), radial-gradient(circle at 88% 78%, rgba(125, 211, 252, ${0.14 * intensity}), transparent 22%), radial-gradient(ellipse at 50% 108%, rgba(15, 23, 42, ${0.16 * intensity}), transparent 52%)`,
  }
}

export function getWhiteoutOverlayStyle(state: SceneWeatherState) {
  const intensity = getSnowstormIntensity(state)
  const opacity = CesiumMath.lerp(0, 0.48, intensity)
  const lowerVeil = CesiumMath.lerp(0.06, 0.42, intensity)
  const upperVeil = CesiumMath.lerp(0.01, 0.18, intensity)

  return {
    opacity,
    background: `radial-gradient(ellipse at 50% 54%, rgba(248, 250, 252, ${lowerVeil}), rgba(226, 232, 240, ${upperVeil}) 42%, transparent 78%), linear-gradient(90deg, rgba(241, 245, 249, ${upperVeil}) 0%, rgba(226, 232, 240, ${lowerVeil * 0.72}) 48%, rgba(248, 250, 252, ${upperVeil}) 100%)`,
    backdropFilter: `blur(${CesiumMath.lerp(0, 2.4, intensity)}px) saturate(${CesiumMath.lerp(1, 0.86, intensity)})`,
  }
}

export function getSkyTimeStyle(state: SceneWeatherState) {
  const sky = getSkyPhase(state.time)
  const dawnWarmth = sky.dawn + sky.dusk
  const nightOpacity = 1 - sky.daylight
  const dayBlue = 0.28 + sky.daylight * 0.42
  const horizonWarmth = 0.12 + dawnWarmth * 0.72
  const roseGlow = dawnWarmth * clamp01(state.cloudCover / 90)

  return {
    opacity: CesiumMath.lerp(0.66, 0.92, sky.daylight),
    background: `radial-gradient(ellipse at 50% 82%, rgba(251, 146, 60, ${horizonWarmth}), rgba(244, 114, 182, ${roseGlow * 0.26}) 24%, rgba(245, 158, 11, ${dawnWarmth * 0.32}) 38%, rgba(180, 83, 9, ${dawnWarmth * 0.16}) 58%, transparent 76%), linear-gradient(180deg, rgba(56, 189, 248, ${dayBlue}) 0%, rgba(125, 211, 252, ${0.12 + sky.daylight * 0.18}) 30%, rgba(252, 211, 77, ${dawnWarmth * 0.24}) 54%, rgba(244, 114, 182, ${roseGlow * 0.18}) 68%, rgba(249, 115, 22, ${dawnWarmth * 0.28}) 80%, rgba(15, 23, 42, ${0.72 * nightOpacity}) 100%)`,
  }
}

export function getTwilightCloudGlowStyle(state: SceneWeatherState) {
  const sky = getSkyPhase(state.time)
  const twilight = clamp01(sky.dawn + sky.dusk)
  const cloudFactor = clamp01((state.cloudCover - 18) / 82)
  const precipitationDampening = CesiumMath.lerp(1, 0.62, clamp01(state.precipitation / 14))
  const opacity = twilight * cloudFactor * precipitationDampening

  return {
    opacity,
    background: `linear-gradient(180deg, transparent 0%, rgba(252, 211, 77, ${0.08 * opacity}) 34%, rgba(251, 146, 60, ${0.24 * opacity}) 58%, rgba(244, 114, 182, ${0.2 * opacity}) 76%, transparent 100%), radial-gradient(ellipse at 50% 72%, rgba(251, 113, 133, ${0.22 * opacity}), rgba(251, 146, 60, ${0.14 * opacity}) 38%, transparent 72%)`,
  }
}

export function getLensDropletStyle(droplet: LensDroplet, state: SceneWeatherState) {
  const intensity = getWetLensIntensity(state)
  const width = droplet.size
  const height = droplet.size * droplet.stretch

  return {
    left: `${droplet.left}%`,
    top: `${droplet.top}%`,
    width: `${width}px`,
    height: `${height}px`,
    opacity: droplet.alpha * intensity,
    transform: `translate(-50%, -50%) rotate(${CesiumMath.lerp(-10, 12, droplet.left / 100)}deg)`,
  }
}
