import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SkyConditions from './SkyConditions.vue'

describe('SkyConditions.vue (Integration)', () => {
  it('주어진 props로 하위 하늘 상태 스펙 컴포넌트들을 정상적으로 렌더링해야 한다', () => {
    const wrapper = mount(SkyConditions, {
      props: { cloudCover: 40, precipitation: 1.5, visibility: 12 },
    })

    // 하위 컴포넌트들의 계산된 결과나 props 값이 렌더링되는지 확인
    expect(wrapper.text()).toContain('40')
    expect(wrapper.text()).toContain('구름 조금')
    expect(wrapper.text()).toContain('1.5')
    expect(wrapper.text()).toContain('약한 비')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('선명함')
  })
})
