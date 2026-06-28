import { Cartesian3, JulianDate, Transforms } from 'cesium'
import { describe, expect, it, vi } from 'vitest'
import { WORLD_LOCATIONS } from '../model/scene.constants'
import {
  getCurrentLocalTimeForLocation,
  getSceneDateFromLocalTime,
  getSkyPhase,
  getSunPositionForTime,
} from './sky'

describe('하늘 시간 계산', () => {
  it('낮 시간에는 daylight가 높고 새벽/노을 계수가 낮아야 한다', () => {
    const phase = getSkyPhase(12)

    expect(phase.daylight).toBeGreaterThan(0.9)
    expect(phase.dawn).toBe(0)
    expect(phase.dusk).toBe(0)
    expect(phase.horizonGlow).toBe(0)
  })

  it('일출과 일몰 근처에는 horizonGlow를 높여야 한다', () => {
    expect(getSkyPhase(5.4).horizonGlow).toBeGreaterThan(0.9)
    expect(getSkyPhase(20.5).horizonGlow).toBeGreaterThan(0.9)
  })

  it('시간 값은 24시간 단위로 래핑되어야 한다', () => {
    expect(getSkyPhase(-1)).toEqual(getSkyPhase(23))
    expect(getSkyPhase(25)).toEqual(getSkyPhase(1))
  })

  it('뉴욕 로컬 시간을 Cesium에 넣을 UTC Date로 변환해야 한다', () => {
    expect(getSceneDateFromLocalTime(16.5).toISOString()).toBe('2026-06-20T20:30:00.000Z')
  })

  it('선택 도시의 UTC 오프셋으로 로컬 시간을 변환해야 한다', () => {
    expect(getSceneDateFromLocalTime(16.5, WORLD_LOCATIONS[2]).toISOString()).toBe(
      '2026-06-20T07:30:00.000Z',
    )
    expect(getSceneDateFromLocalTime(16.5, WORLD_LOCATIONS[9]).toISOString()).toBe(
      '2026-06-20T10:30:00.000Z',
    )
  })

  it('현재 UTC 시간을 선택 도시의 24시간 현지 시간으로 변환해야 한다', () => {
    expect(
      getCurrentLocalTimeForLocation(WORLD_LOCATIONS[2], new Date('2026-06-27T03:15:00.000Z')),
    ).toBe(12.3)
    expect(
      getCurrentLocalTimeForLocation(WORLD_LOCATIONS[1], new Date('2026-06-27T03:15:00.000Z')),
    ).toBe(23.3)
  })

  it('JulianDate 기준 태양 위치 벡터를 계산해야 한다', () => {
    const result = getSunPositionForTime(
      JulianDate.fromDate(new Date('2026-06-20T07:30:00.000Z')),
      new Cartesian3(),
    )

    expect(Cartesian3.magnitude(result)).toBeGreaterThan(0)
  })

  it('ICRF 변환 행렬이 없으면 TEME 변환 행렬로 대체해야 한다', () => {
    const icrfSpy = vi
      .spyOn(Transforms, 'computeIcrfToCentralBodyFixedMatrix')
      .mockReturnValueOnce(undefined)
    const temeSpy = vi.spyOn(Transforms, 'computeTemeToPseudoFixedMatrix')

    getSunPositionForTime(
      JulianDate.fromDate(new Date('2026-06-20T07:30:00.000Z')),
      new Cartesian3(),
    )

    expect(temeSpy).toHaveBeenCalled()
    icrfSpy.mockRestore()
    temeSpy.mockRestore()
  })
})
