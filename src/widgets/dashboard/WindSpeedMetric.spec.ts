import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WindSpeedMetric from './WindSpeedMetric.vue'

describe('풍속 지표 카드', () => {
  it('풍속이 0.5 미만이면 고요 상태를 렌더링해야 한다', () => {
    const wrapper = mount(WindSpeedMetric, {
      props: { windSpeed: 0.2, windDirectionDegrees: 0 },
    })

    expect(wrapper.text()).toContain('북풍')
    expect(wrapper.text()).toContain('고요')
    expect(wrapper.text()).toContain('Calm')
    expect(wrapper.text()).toContain('거의 무풍 →')
    expect(wrapper.text()).toContain('바람 영향이 거의 없어 강수 입자는 수직에 가깝게 떨어집니다.')
  })

  it('약한 풍속이면 안정 상태를 렌더링해야 한다', () => {
    const wrapper = mount(WindSpeedMetric, {
      props: { windSpeed: 2.4, windDirectionDegrees: 67.5 },
    })

    expect(wrapper.text()).toContain('동북동풍')
    expect(wrapper.text()).toContain('실바람')
    expect(wrapper.text()).toContain('Light Air')
    expect(wrapper.text()).toContain('안정 풍속 ↗')
  })

  it('남실바람 범위를 렌더링해야 한다', () => {
    const wrapper = mount(WindSpeedMetric, {
      props: { windSpeed: 5, windDirectionDegrees: 225 },
    })

    expect(wrapper.text()).toContain('남서풍')
    expect(wrapper.text()).toContain('남실바람')
    expect(wrapper.text()).toContain('Light Breeze')
  })

  it('산들바람 범위를 렌더링해야 한다', () => {
    const wrapper = mount(WindSpeedMetric, {
      props: { windSpeed: 7, windDirectionDegrees: 157.5 },
    })

    expect(wrapper.text()).toContain('남남동풍')
    expect(wrapper.text()).toContain('산들바람')
    expect(wrapper.text()).toContain('Gentle Breeze')
    expect(wrapper.text()).toContain('주의 풍속 ↗')
  })

  it('건들바람 범위를 렌더링해야 한다', () => {
    const wrapper = mount(WindSpeedMetric, {
      props: { windSpeed: 9.2, windDirectionDegrees: 292.5 },
    })

    expect(wrapper.text()).toContain('서북서풍')
    expect(wrapper.text()).toContain('건들바람')
    expect(wrapper.text()).toContain('Moderate Breeze')
  })

  it('강한 바람이면 강풍 상태를 렌더링해야 한다', () => {
    const wrapper = mount(WindSpeedMetric, {
      props: { windSpeed: 12, windDirectionDegrees: -45 },
    })

    expect(wrapper.text()).toContain('북서풍')
    expect(wrapper.text()).toContain('315°')
    expect(wrapper.text()).toContain('강한 바람')
    expect(wrapper.text()).toContain('Strong Breeze')
    expect(wrapper.text()).toContain('강풍 영향 ↗')
    expect(wrapper.text()).toContain(
      '강한 바람으로 눈과 비가 빠르게 휘날리며 시정 저하가 커질 수 있습니다.',
    )
  })

  it('풍속 진행 막대 값은 0에서 100 사이로 제한해야 한다', () => {
    const lowWrapper = mount(WindSpeedMetric, {
      props: { windSpeed: -3, windDirectionDegrees: 0 },
    })
    const highWrapper = mount(WindSpeedMetric, {
      props: { windSpeed: 20, windDirectionDegrees: 0 },
    })

    expect(lowWrapper.find('.bg-gradient-to-r').attributes('style')).toContain('width: 0%;')
    expect(highWrapper.find('.bg-gradient-to-r').attributes('style')).toContain('width: 100%;')
  })
})
