import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HumidityMetric from './HumidityMetric.vue'

describe('습도 지표 카드', () => {
  it('습도가 낮으면 건조 상태와 낮은 수분도 라벨을 렌더링해야 한다', () => {
    const wrapper = mount(HumidityMetric, { props: { humidity: 20 } })

    expect(wrapper.text()).toContain('건조')
    expect(wrapper.text()).toContain('낮은 수분도 ↗')
  })

  it('습도가 안정 범위이면 안정 상태와 안정 응결도 라벨을 렌더링해야 한다', () => {
    const wrapper = mount(HumidityMetric, { props: { humidity: 62 } })

    expect(wrapper.text()).toContain('안정')
    expect(wrapper.text()).toContain('안정 응결도 ↗')
  })

  it('습도가 높으면 습함 상태와 높은 응결도 라벨을 렌더링해야 한다', () => {
    const wrapper = mount(HumidityMetric, { props: { humidity: 82 } })

    expect(wrapper.text()).toContain('습함')
    expect(wrapper.text()).toContain('높은 응결도 ↗')
  })

  it('습도 게이지 값은 0에서 100 사이로 제한해야 한다', () => {
    const lowWrapper = mount(HumidityMetric, { props: { humidity: -12 } })
    const highWrapper = mount(HumidityMetric, { props: { humidity: 140 } })

    expect(
      lowWrapper.find('circle[stroke="url(#humGradient)"]').attributes('stroke-dashoffset'),
    ).toBe('276.46')
    expect(
      highWrapper.find('circle[stroke="url(#humGradient)"]').attributes('stroke-dashoffset'),
    ).toBe('0')
  })

  it('습도 막대는 20퍼센트 단위 반올림 값만큼 활성화해야 한다', () => {
    const wrapper = mount(HumidityMetric, { props: { humidity: 49 } })
    const bars = wrapper.findAll('.grid > div')
    const activeBars = bars.filter((bar) => bar.classes().includes('bg-cyan-400/45'))

    expect(activeBars).toHaveLength(2)
  })
})
