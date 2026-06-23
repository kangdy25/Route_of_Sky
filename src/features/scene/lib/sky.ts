import { Cartesian3, JulianDate, Matrix3, Simon1994PlanetaryPositions, Transforms } from 'cesium'

import {
  SCENE_DATE,
  SEOUL_SUMMER_SOLAR,
  SEOUL_TIMEZONE_OFFSET_HOURS,
} from '../model/scene.constants'
import { clamp01, smoothstep } from './math'

const sunTransformScratch = new Matrix3()

export function getSkyPhase(time: number) {
  const localTime = ((time % 24) + 24) % 24
  const solar = SEOUL_SUMMER_SOLAR
  const morningLight = smoothstep(solar.sunriseStart, solar.sunrise + 0.8, localTime)
  const eveningFade = 1 - smoothstep(solar.sunset - 1.0, solar.duskEnd, localTime)
  const daylight = clamp01(morningLight * eveningFade)
  const dawn = clamp01(1 - Math.abs(localTime - solar.sunrise) / 1.65)
  const dusk = clamp01(1 - Math.abs(localTime - solar.sunset) / 1.8)
  const horizonGlow = Math.max(dawn, dusk)

  return {
    daylight,
    dawn,
    dusk,
    horizonGlow,
  }
}

export function getSceneDateFromLocalTime(time: number) {
  const hour = Math.floor(time)
  const minutes = Math.round((time - hour) * 60)

  return new Date(
    Date.UTC(
      SCENE_DATE.year,
      SCENE_DATE.monthIndex,
      SCENE_DATE.day,
      hour + SEOUL_TIMEZONE_OFFSET_HOURS,
      minutes,
    ),
  )
}

export function getSunPositionForTime(time: JulianDate, result: Cartesian3) {
  const transform =
    Transforms.computeIcrfToCentralBodyFixedMatrix(time, sunTransformScratch) ??
    Transforms.computeTemeToPseudoFixedMatrix(time, sunTransformScratch)
  const inertialPosition = Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(
    time,
    result,
  )

  return Matrix3.multiplyByVector(transform, inertialPosition, result)
}
