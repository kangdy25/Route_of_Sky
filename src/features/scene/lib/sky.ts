import { Cartesian3, JulianDate, Matrix3, Simon1994PlanetaryPositions, Transforms } from 'cesium'

import {
  SCENE_DATE,
  SEOUL_SUMMER_SOLAR,
  SEOUL_TIMEZONE_OFFSET_HOURS,
} from '../model/scene.constants'
import { clampToUnitInterval, smoothstep } from './math'

const sunTransformScratch = new Matrix3()

// 서울 여름 기준의 로컬 시간 값을 daylight/dawn/dusk 계수로 변환합니다.
// Cesium 시계와 DOM 오버레이가 같은 시간대 해석을 공유하도록 이 함수만 사용합니다.
export function getSkyPhase(time: number) {
  const localTime = ((time % 24) + 24) % 24
  const solar = SEOUL_SUMMER_SOLAR
  const morningLight = smoothstep(solar.sunriseStart, solar.sunrise + 0.8, localTime)
  const eveningFade = 1 - smoothstep(solar.sunset - 1.0, solar.duskEnd, localTime)
  const daylight = clampToUnitInterval(morningLight * eveningFade)
  const dawn = clampToUnitInterval(1 - Math.abs(localTime - solar.sunrise) / 1.65)
  const dusk = clampToUnitInterval(1 - Math.abs(localTime - solar.sunset) / 1.8)
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

  // UI의 서울 로컬 시간을 UTC Date로 바꿔 Cesium JulianDate에 넣습니다.
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
  // Cesium이 제공하는 inertial sun position을 현재 지구 고정 좌표계로 변환합니다.
  const transform =
    Transforms.computeIcrfToCentralBodyFixedMatrix(time, sunTransformScratch) ??
    Transforms.computeTemeToPseudoFixedMatrix(time, sunTransformScratch)
  const inertialPosition = Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(
    time,
    result,
  )

  return Matrix3.multiplyByVector(transform, inertialPosition, result)
}
