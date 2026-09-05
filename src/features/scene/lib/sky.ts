import { Cartesian3, JulianDate, Matrix3, Simon1994PlanetaryPositions, Transforms } from 'cesium'

import { SCENE_DATE, WORLD_LOCATIONS } from '../model/scene.constants'
import type { SceneLocation, SkyPhase } from '../model/scene.types'
import { clampToUnitInterval, smoothstep } from './math'

/** 태양 좌표 변환 시 GC 부하 방지를 위한 임시 행렬 버퍼 */
const sunTransformScratch = new Matrix3()

/** getSkyPhase 기본 반환용 재사용 버퍼 (매 프레임 객체 할당 방지) */
const defaultSkyPhaseScratch: SkyPhase = {
  dawn: 0,
  daylight: 0,
  sunset: 0,
  night: 0,
  horizonGlow: 0,
}

/**
 * 24시간제 로컬 시간을 입력받아 하늘·조명에 사용할 영향도 계수(0.0 ~ 1.0)로 변환합니다.
 * 시간 프리셋 버튼은 장면을 빠르게 탐색하기 위한 UI 값이고, 실제 조도는 일출부터 해질녘까지
 * 부드럽게 이어져야 하므로 별도의 태양 전환 구간을 사용합니다.
 *
 * @param time 24시간제 로컬 시간 수치 (0.0 ~ 24.0, 예: 14.5 = 14:30)
 * @param result 재사용할 SkyPhase 객체 버퍼 (생략 시 내부 scratch 버퍼 사용)
 * @returns {SkyPhase} 새벽(dawn), 낮(daylight), 일몰(sunset), 밤(night), 노을(horizonGlow) 광량 계수
 */
export function getSkyPhase(time: number, result: SkyPhase = defaultSkyPhaseScratch): SkyPhase {
  const localTime = ((time % 24) + 24) % 24

  const sunriseStart = 4.75
  const sunrise = 5.4
  const sunset = 20.5
  const sunsetEnd = 21.25
  const morningLight = smoothstep(sunriseStart, sunrise + 0.8, localTime)
  const eveningFade = 1 - smoothstep(sunset - 1.0, sunsetEnd, localTime)
  const daylight = clampToUnitInterval(morningLight * eveningFade)

  result.dawn = clampToUnitInterval(1 - Math.abs(localTime - sunrise) / 1.65)
  result.daylight = daylight
  result.sunset = clampToUnitInterval(1 - Math.abs(localTime - sunset) / 1.8)
  result.night = 1 - daylight
  result.horizonGlow = Math.max(result.dawn, result.sunset)

  return result
}

/** UI 슬라이더의 로컬 시간(0.00 ~ 24.00)을 선택 도시의 UTC 기준 Date 객체로 변환합니다. */
export function getSceneDateFromLocalTime(time: number, location: SceneLocation = WORLD_LOCATIONS[1]): Date {
  const normalizedLocalTime = ((time % 24) + 24) % 24
  // 로컬 시간(시)에서 UTC 오프셋을 뺀 실제 UTC 시간(시)
  const utcDecimalHours = normalizedLocalTime - location.utcOffsetHours

  // 소수점 오프셋(예: +5.5)으로 인한 분 오차를 방지하기 위해 밀리초 단위로 정밀 연산
  const baseUtcMidnight = Date.UTC(SCENE_DATE.year, SCENE_DATE.monthIndex, SCENE_DATE.day, 0, 0, 0, 0)
  const totalOffsetMs = Math.round(utcDecimalHours * 3600 * 1000)

  return new Date(baseUtcMidnight + totalOffsetMs)
}

/** 특정 도시의 현재 로컬 시간을 24시간제 소수점 1자리 수치로 반환합니다. */
export function getCurrentLocalTimeForLocation(
  location: SceneLocation = WORLD_LOCATIONS[1],
  date = new Date(),
): number {
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3600000

  return Math.round(((((utcHours + location.utcOffsetHours) % 24) + 24) % 24) * 10) / 10
}

/** Cesium이 제공하는 inertial sun position을 현재 지구 고정 좌표계(Fixed Frame)로 변환합니다. */
export function getSunPositionForTime(time: JulianDate, result: Cartesian3): Cartesian3 {
  const transform =
    Transforms.computeIcrfToCentralBodyFixedMatrix(time, sunTransformScratch) ??
    Transforms.computeTemeToPseudoFixedMatrix(time, sunTransformScratch)
  const inertialPosition = Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(time, result)

  return Matrix3.multiplyByVector(transform, inertialPosition, result)
}
