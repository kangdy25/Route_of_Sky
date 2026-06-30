import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { WORLD_LOCATIONS } from '@/features/scene/model/scene.constants'
import AppHeader from './AppHeader.vue'

const baseProps = {
  locations: WORLD_LOCATIONS,
  selectedLocationId: 'us-new-york',
}

describe('앱 헤더', () => {
  it('브랜드와 현재 위치를 렌더링해야 한다', () => {
    const wrapper = mount(AppHeader, {
      props: baseProps,
    })

    expect(wrapper.text()).toContain('Route of Sky')
    expect(wrapper.text()).toContain('미국, 뉴욕')
    expect(wrapper.text()).toContain('이스라엘, 예루살렘')
    expect(wrapper.find('img[alt="Route of Sky"]').exists()).toBe(true)
  })

  it('지역을 선택하면 selectLocation 이벤트를 발생시켜야 한다', async () => {
    const wrapper = mount(AppHeader, {
      props: baseProps,
    })

    await wrapper.find('select[aria-label="지역 선택"]').setValue('il-jerusalem')

    expect(wrapper.emitted('selectLocation')?.[0]).toEqual(['il-jerusalem'])
  })

  it('비행 버튼을 클릭하면 flyToSelectedLocation 이벤트를 발생시켜야 한다', async () => {
    const wrapper = mount(AppHeader, {
      props: baseProps,
    })

    await wrapper.find('button[aria-label="Fly to selected location"]').trigger('click')

    expect(wrapper.emitted('flyToSelectedLocation')).toHaveLength(1)
  })

  it('설정 버튼을 클릭하면 openSettings 이벤트를 발생시켜야 한다', async () => {
    const wrapper = mount(AppHeader, {
      props: baseProps,
    })

    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    expect(wrapper.emitted('openSettings')).toHaveLength(1)
  })

  it('모바일 대시보드 토글 버튼을 클릭하면 toggleDashboard 이벤트를 발생시켜야 한다', async () => {
    const wrapper = mount(AppHeader, {
      props: baseProps,
    })

    await wrapper.find('button[aria-label="Hide dashboard"]').trigger('click')

    expect(wrapper.emitted('toggleDashboard')).toHaveLength(1)
  })
})
