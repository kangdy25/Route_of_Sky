import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import PrecipitationMetric from './PrecipitationMetric.vue'

describe('강수량 지표 카드', () => {
  it('강수량이 0일 때 "없음"을 렌더링해야 한다', () => {
    const wrapper = mount(PrecipitationMetric, { props: { precipitation: 0 } })
    expect(wrapper.text()).toContain('없음')
  })

  it('강수량이 2.5 미만일 때 "약한 비"를 렌더링해야 한다', () => {
    const wrapper = mount(PrecipitationMetric, { props: { precipitation: 1.5 } })
    expect(wrapper.text()).toContain('약한 비')
  })

  it('강수량이 7.6 미만일 때 "보통 비"를 렌더링해야 한다', () => {
    const wrapper = mount(PrecipitationMetric, { props: { precipitation: 5.0 } })
    expect(wrapper.text()).toContain('보통 비')
  })

  it('강수량이 7.6 이상일 때 "강한 비"를 렌더링해야 한다', () => {
    const wrapper = mount(PrecipitationMetric, { props: { precipitation: 10.0 } })
    expect(wrapper.text()).toContain('강한 비')
  })
})
