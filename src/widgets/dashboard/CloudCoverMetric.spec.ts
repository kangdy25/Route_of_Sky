import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CloudCoverMetric from './CloudCoverMetric.vue'

describe('운량 지표 카드', () => {
  it('운량이 10 미만일 때 "맑음"을 렌더링해야 한다', () => {
    const wrapper = mount(CloudCoverMetric, { props: { cloudCover: 5 } })
    expect(wrapper.text()).toContain('맑음')
  })

  it('운량이 50 미만일 때 "구름 조금"을 렌더링해야 한다', () => {
    const wrapper = mount(CloudCoverMetric, { props: { cloudCover: 40 } })
    expect(wrapper.text()).toContain('구름 조금')
  })

  it('운량이 80 미만일 때 "구름 많음"을 렌더링해야 한다', () => {
    const wrapper = mount(CloudCoverMetric, { props: { cloudCover: 70 } })
    expect(wrapper.text()).toContain('구름 많음')
  })

  it('운량이 80 이상일 때 "흐림"을 렌더링해야 한다', () => {
    const wrapper = mount(CloudCoverMetric, { props: { cloudCover: 90 } })
    expect(wrapper.text()).toContain('흐림')
  })
})
