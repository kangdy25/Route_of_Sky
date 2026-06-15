import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import VisibilitySpec from './VisibilitySpec.vue'

describe('가시거리 스펙 카드', () => {
  it('가시거리가 10 이상일 때 "선명함"을 렌더링해야 한다', () => {
    const wrapper = mount(VisibilitySpec, { props: { visibility: 12 } })
    expect(wrapper.text()).toContain('선명함')
  })

  it('가시거리가 5 이상 10 미만일 때 "연무"를 렌더링해야 한다', () => {
    const wrapper = mount(VisibilitySpec, { props: { visibility: 7 } })
    expect(wrapper.text()).toContain('연무')
  })

  it('가시거리가 2 이상 5 미만일 때 "박무"를 렌더링해야 한다', () => {
    const wrapper = mount(VisibilitySpec, { props: { visibility: 3 } })
    expect(wrapper.text()).toContain('박무')
  })

  it('가시거리가 2 미만일 때 "안개"를 렌더링해야 한다', () => {
    const wrapper = mount(VisibilitySpec, { props: { visibility: 1 } })
    expect(wrapper.text()).toContain('안개')
  })
})
