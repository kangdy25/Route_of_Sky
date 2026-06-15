import { describe, expect, it } from 'vitest'
import { getColorForHeight, getTerrainHeight, terrainBaseY, terrainHeightScale } from './terrain'

describe('지형 유틸리티', () => {
  it('같은 좌표에 대해 항상 같은 지형 높이를 반환해야 한다', () => {
    expect(getTerrainHeight(42, -17)).toBe(getTerrainHeight(42, -17))
  })

  it('생성된 지형 높이가 설정된 산 높이 범위 안에 있어야 한다', () => {
    const samples = [
      getTerrainHeight(0, 0),
      getTerrainHeight(25, 25),
      getTerrainHeight(120, -80),
      getTerrainHeight(-160, 140),
    ]

    for (const height of samples) {
      expect(height).toBeGreaterThanOrEqual(0)
      expect(height).toBeLessThanOrEqual(terrainHeightScale)
    }
  })

  it('씬 오브젝트가 공유하는 지형 기준 높이 오프셋을 제공해야 한다', () => {
    expect(terrainBaseY).toBe(-10)
  })

  it('낮은 지대, 중간 지대, 산봉우리를 서로 다른 색상 구간으로 매핑해야 한다', () => {
    const meadow = getColorForHeight(2)
    const mountain = getColorForHeight(8)
    const peak = getColorForHeight(16)

    expect(meadow.equals(mountain)).toBe(false)
    expect(mountain.equals(peak)).toBe(false)
    expect(peak.r).toBeGreaterThan(mountain.r)
    expect(peak.g).toBeGreaterThan(mountain.g)
    expect(peak.b).toBeGreaterThan(mountain.b)
  })
})
