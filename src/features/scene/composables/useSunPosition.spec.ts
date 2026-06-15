import { computed, reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import { useSunPosition } from './useSunPosition'
import type { SceneWeatherProps } from '../types'

function createProps(overrides: Partial<SceneWeatherProps> = {}) {
  return reactive({
    time: 16.5,
    cloudCover: 65,
    precipitation: 0,
    aqi: 45,
    visibility: 15,
    ...overrides,
  })
}

describe('태양 위치 계산', () => {
  it('정오에는 스타일라이즈된 태양이 지평선 위에 있어야 한다', () => {
    const props = createProps({ time: 12 })
    const { sunPosition, sunDirectionArray } = useSunPosition(
      props,
      computed(() => false),
      computed(() => 5),
    )

    expect(sunPosition.value.y).toBeGreaterThan(0)
    expect(sunDirectionArray.value[1]).toBeGreaterThan(0)
  })

  it('태양이 지평선 아래에 있으면 반대 방향을 달빛 위치로 사용해야 한다', () => {
    const props = createProps({ time: 0 })
    const { sunPosition, sunDirectionArray } = useSunPosition(
      props,
      computed(() => false),
      computed(() => 5),
    )

    expect(sunPosition.value.y).toBeLessThan(0)
    expect(sunDirectionArray.value[1]).toBeGreaterThan(0)
  })

  it('지도 타일이 활성화되면 Google 타일용 태양 경로를 사용해야 한다', () => {
    const props = createProps({ time: 12 })
    const { sunPosition } = useSunPosition(
      props,
      computed(() => true),
      computed(() => 12000),
    )

    expect(sunPosition.value.y).toBeGreaterThan(0)
    expect(sunPosition.value.z).toBeGreaterThan(0)
  })

  it('태양 고도에 따라 낮, 밤, 노을 계수를 계산해야 한다', () => {
    const props = createProps({ time: 6 })
    const { timeFactors } = useSunPosition(
      props,
      computed(() => false),
      computed(() => 5),
    )

    expect(timeFactors.value.dayFactor).toBeCloseTo(0.3)
    expect(timeFactors.value.nightFactor).toBeCloseTo(0.3)
    expect(timeFactors.value.sunsetFactor).toBeCloseTo(0.4)
  })
})
