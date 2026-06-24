import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppHeader from './AppHeader.vue'

describe('앱 헤더', () => {
  it('브랜드와 현재 위치를 렌더링해야 한다', () => {
    const wrapper = mount(AppHeader)

    expect(wrapper.text()).toContain('Route of Sky')
    expect(wrapper.text()).toContain('SEOUL, JAMSIL')
    expect(wrapper.find('img[alt="Route of Sky"]').exists()).toBe(true)
  })

  it('잠실 비행 버튼을 클릭하면 flyToJamsil 이벤트를 발생시켜야 한다', async () => {
    const wrapper = mount(AppHeader)

    await wrapper.find('button[aria-label="Jamsil fly-through"]').trigger('click')

    expect(wrapper.emitted('flyToJamsil')).toHaveLength(1)
  })
})
