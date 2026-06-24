import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DashboardOverlay from './DashboardOverlay.vue'

const { fromTo } = vi.hoisted(() => ({
  fromTo: vi.fn(),
}))

vi.mock('gsap', () => ({
  gsap: {
    fromTo,
  },
}))

const baseProps = {
  time: 16.5,
  temperature: 24.5,
  humidity: 62,
  windSpeed: 5,
  windDirectionDegrees: 225,
  aqi: 45,
  cloudCover: 35,
  precipitation: 0,
  visibility: 15,
}

describe('대시보드 오버레이', () => {
  it('주요 패널을 렌더링해야 한다', () => {
    const wrapper = mount(DashboardOverlay, {
      props: baseProps,
    })

    expect(wrapper.text()).toContain('Route of Sky')
    expect(wrapper.text()).toContain('환경 정보')
    expect(wrapper.text()).toContain('하늘 상태')
    expect(wrapper.text()).toContain('대기질 정보')
    expect(wrapper.text()).toContain('시간대 탐색')
  })

  it('마운트 시 오버레이 등장 애니메이션을 실행해야 한다', () => {
    mount(DashboardOverlay, {
      props: baseProps,
    })

    expect(fromTo).toHaveBeenCalled()
  })

  it('헤더의 잠실 비행 이벤트를 상위로 전달해야 한다', async () => {
    const wrapper = mount(DashboardOverlay, {
      props: baseProps,
    })

    await wrapper.find('button[aria-label="Jamsil fly-through"]').trigger('click')

    expect(wrapper.emitted('flyToJamsil')).toHaveLength(1)
  })

  it('시간 패널의 v-model 업데이트를 전달해야 한다', async () => {
    const wrapper = mount(DashboardOverlay, {
      props: {
        ...baseProps,
        'onUpdate:time': (value: number) => wrapper.setProps({ time: value }),
      },
    })

    await wrapper.find('input[type="range"]').setValue('19.5')

    expect(wrapper.emitted('update:time')?.[0]).toEqual([19.5])
  })

  it('대시보드 영역의 포인터 이벤트가 배경 scene으로 전파되지 않아야 한다', async () => {
    const wrapper = mount(DashboardOverlay, {
      props: baseProps,
    })
    const frame = wrapper.find('.dashboard-frame')
    const events = [
      'click',
      'dblclick',
      'mousedown',
      'mouseup',
      'mousemove',
      'pointerdown',
      'pointermove',
      'pointerup',
      'touchstart',
      'touchmove',
      'touchend',
      'wheel',
    ]

    for (const eventName of events) {
      const event = new Event(eventName, { bubbles: true, cancelable: true })
      const stopPropagation = vi.spyOn(event, 'stopPropagation')

      frame.element.dispatchEvent(event)

      expect(stopPropagation).toHaveBeenCalled()
    }
  })
})
