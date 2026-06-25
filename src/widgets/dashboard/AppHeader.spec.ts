import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppHeader from './AppHeader.vue'

describe('앱 헤더', () => {
  it('브랜드와 현재 위치를 렌더링해야 한다', () => {
    const wrapper = mount(AppHeader)

    expect(wrapper.text()).toContain('Route of Sky')
    expect(wrapper.text()).toContain('NYC, TIMES SQUARE')
    expect(wrapper.find('img[alt="Route of Sky"]').exists()).toBe(true)
  })

  it('타임스퀘어 비행 버튼을 클릭하면 flyToTimesSquare 이벤트를 발생시켜야 한다', async () => {
    const wrapper = mount(AppHeader)

    await wrapper.find('button[aria-label="Times Square fly-through"]').trigger('click')

    expect(wrapper.emitted('flyToTimesSquare')).toHaveLength(1)
  })

  it('설정 버튼을 클릭하면 openSettings 이벤트를 발생시켜야 한다', async () => {
    const wrapper = mount(AppHeader)

    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    expect(wrapper.emitted('openSettings')).toHaveLength(1)
  })
})
