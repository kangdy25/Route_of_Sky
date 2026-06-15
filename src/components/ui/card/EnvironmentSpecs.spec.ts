import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import EnvironmentSpecs from './EnvironmentSpecs.vue'

describe('환경 정보 카드 통합 렌더링', () => {
  it('주어진 props로 하위 환경 스펙 컴포넌트들을 정상적으로 렌더링해야 한다', () => {
    const wrapper = mount(EnvironmentSpecs, {
      props: { temperature: 25, humidity: 60, windSpeed: 5 },
    })

    // 기온, 습도, 풍속 데이터가 화면에 표시되는지 확인
    expect(wrapper.text()).toContain('25')
    expect(wrapper.text()).toContain('60')
    expect(wrapper.text()).toContain('5')
  })
})
