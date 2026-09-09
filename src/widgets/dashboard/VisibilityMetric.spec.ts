import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import VisibilityMetric from './VisibilityMetric.vue'

describe('가시거리 지표 카드', () => {
  it('가시거리가 15 이상일 때 "선명함"을 렌더링해야 한다', () => {
    const wrapper = mount(VisibilityMetric, { props: { visibility: 16 } })
    expect(wrapper.text()).toContain('선명함')
  })

  it('가시거리가 10 이상 15 미만일 때 "약간 탁함"을 렌더링해야 한다', () => {
    const wrapper = mount(VisibilityMetric, { props: { visibility: 12 } })
    expect(wrapper.text()).toContain('약간 탁함')
  })

  it('가시거리가 5 이상 10 미만일 때 "옅은 안개"를 렌더링해야 한다', () => {
    const wrapper = mount(VisibilityMetric, { props: { visibility: 7 } })
    expect(wrapper.text()).toContain('옅은 안개')
  })

  it('가시거리가 5 미만일 때 "짙은 안개"를 렌더링해야 한다', () => {
    const wrapper = mount(VisibilityMetric, { props: { visibility: 3 } })
    expect(wrapper.text()).toContain('짙은 안개')
  })

  it('가시거리는 한 자리 소수까지만 표시하고 .0은 생략해야 한다', () => {
    const fractional = mount(VisibilityMetric, { props: { visibility: 7.26 } })
    const whole = mount(VisibilityMetric, { props: { visibility: 12 } })

    expect(fractional.text()).toContain('7.3 km')
    expect(whole.text()).toContain('12 km')
    expect(whole.text()).not.toContain('12.0 km')
  })
})
