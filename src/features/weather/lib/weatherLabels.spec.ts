import { describe, expect, it } from 'vitest'
import {
  getCloudCoverLabel,
  getPrecipitationLabel,
  getTimeStatus,
  getVisibilityLabel,
} from './weatherLabels'

describe('날씨 표시 라벨', () => {
  it('운량 범위에 맞는 라벨을 반환해야 한다', () => {
    expect(getCloudCoverLabel(5)).toBe('맑음')
    expect(getCloudCoverLabel(40)).toBe('구름 조금')
    expect(getCloudCoverLabel(70)).toBe('구름 많음')
    expect(getCloudCoverLabel(90)).toBe('흐림')
  })

  it('강수량 범위에 맞는 라벨을 반환해야 한다', () => {
    expect(getPrecipitationLabel(0)).toBe('없음')
    expect(getPrecipitationLabel(1.5)).toBe('약한 비')
    expect(getPrecipitationLabel(5)).toBe('보통 비')
    expect(getPrecipitationLabel(10)).toBe('강한 비')
  })

  it('가시거리 범위에 맞는 라벨을 반환해야 한다', () => {
    expect(getVisibilityLabel(12)).toBe('선명함')
    expect(getVisibilityLabel(7)).toBe('연무')
    expect(getVisibilityLabel(3)).toBe('박무')
    expect(getVisibilityLabel(1)).toBe('안개')
  })

  it('시간대별 상태 문구를 반환해야 한다', () => {
    expect(getTimeStatus(2)).toEqual({ title: '깊은 밤', subtitle: '별빛이 빛나는 하늘' })
    expect(getTimeStatus(6)).toEqual({ title: '일출 새벽', subtitle: '붉게 물드는 하늘' })
    expect(getTimeStatus(8)).toEqual({ title: '아침 태양', subtitle: '맑고 상쾌한 하늘' })
    expect(getTimeStatus(12)).toEqual({ title: '낮 태양', subtitle: '푸르고 선명한 하늘' })
    expect(getTimeStatus(16)).toEqual({ title: '오후 태양', subtitle: '맑고 밝은 하늘' })
    expect(getTimeStatus(18)).toEqual({ title: '일몰 노을', subtitle: '붉고 노란 하늘' })
    expect(getTimeStatus(22)).toEqual({ title: '늦은 밤', subtitle: '어스름한 밤하늘' })
  })
})
