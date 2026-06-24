import { describe, expect, it } from 'vitest'
import { clampToRange, clampToUnitInterval, lerpRadians, smoothstep } from './math'

describe('scene 수치 유틸', () => {
  it('값을 0과 1 사이로 제한해야 한다', () => {
    expect(clampToUnitInterval(-0.5)).toBe(0)
    expect(clampToUnitInterval(0.4)).toBe(0.4)
    expect(clampToUnitInterval(1.5)).toBe(1)
  })

  it('값을 지정한 범위 안으로 제한해야 한다', () => {
    expect(clampToRange(-10, 2, 8)).toBe(2)
    expect(clampToRange(5, 2, 8)).toBe(5)
    expect(clampToRange(12, 2, 8)).toBe(8)
  })

  it('smoothstep은 경계 밖을 고정하고 경계 안을 부드럽게 보간해야 한다', () => {
    expect(smoothstep(0, 10, -2)).toBe(0)
    expect(smoothstep(0, 10, 5)).toBe(0.5)
    expect(smoothstep(0, 10, 12)).toBe(1)
  })

  it('라디안 보간은 가장 짧은 회전 방향을 사용해야 한다', () => {
    const result = lerpRadians((350 * Math.PI) / 180, (10 * Math.PI) / 180, 0.5)

    expect(result).toBeCloseTo(Math.PI * 2)
  })
})
