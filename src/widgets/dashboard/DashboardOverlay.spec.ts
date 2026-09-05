import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { WORLD_LOCATIONS } from '@/features/scene/model/scene.constants'
import DashboardOverlay from './DashboardOverlay.vue'

const { fromTo, to, killTweensOf } = vi.hoisted(() => ({
  fromTo: vi.fn(),
  to: vi.fn((_target, options) => {
    options.onComplete?.()
    return { kill: vi.fn() }
  }),
  killTweensOf: vi.fn(),
}))

vi.mock('gsap', () => ({
  gsap: {
    fromTo,
    to,
    killTweensOf,
  },
}))

const baseProps = {
  time: 16.5,
  temperature: 24.5,
  temperatureMin: 12,
  temperatureMax: 31,
  humidity: 62,
  windSpeed: 5,
  windDirectionDegrees: 225,
  aqi: 45,
  cloudCover: 35,
  precipitation: 0,
  visibility: 15,
  qualityMode: 'auto' as const,
  effectiveQuality: 'high' as const,
  locations: WORLD_LOCATIONS,
  selectedLocationId: 'us-new-york',
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

  it('헤더의 선택 지역 비행 이벤트를 상위로 전달해야 한다', async () => {
    const wrapper = mount(DashboardOverlay, {
      props: baseProps,
    })

    await wrapper.find('button[aria-label="Fly to selected location"]').trigger('click')

    expect(wrapper.emitted('flyToSelectedLocation')).toHaveLength(1)
  })

  it('헤더의 지역 선택 이벤트를 상위로 전달해야 한다', async () => {
    const wrapper = mount(DashboardOverlay, {
      props: baseProps,
    })

    await wrapper.find('select[aria-label="지역 선택"]').setValue('il-jerusalem')

    expect(wrapper.emitted('selectLocation')?.[0]).toEqual(['il-jerusalem'])
  })

  it('헤더 설정 버튼을 누르면 설정 패널을 열어야 한다', async () => {
    const wrapper = mount(DashboardOverlay, {
      props: baseProps,
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    expect(wrapper.text()).toContain('환경설정')
    expect(wrapper.text()).toContain('날씨 시뮬레이션 (Lab)')
  })

  it('모바일 대시보드 토글 버튼으로 패널 영역을 접고 펼쳐야 한다', async () => {
    const wrapper = mount(DashboardOverlay, {
      props: baseProps,
    })

    const panels = wrapper.find('#dashboard-panels')
    expect(panels.classes()).toContain('flex')

    await wrapper.find('button[aria-label="Hide dashboard"]').trigger('click')

    expect(wrapper.find('#dashboard-panels').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Show dashboard"]').exists()).toBe(true)

    await wrapper.find('button[aria-label="Show dashboard"]').trigger('click')

    expect(wrapper.find('#dashboard-panels').classes()).toContain('flex')
  })

  it('설정 패널의 날씨 변경과 닫기 이벤트를 처리해야 한다', async () => {
    const wrapper = mount(DashboardOverlay, {
      props: baseProps,
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    await wrapper.find('button[aria-label="Open settings"]').trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '새벽')
      ?.trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '비')
      ?.trigger('click')

    expect(wrapper.emitted('setTime')?.[0]).toEqual([6.2])
    expect(wrapper.emitted('previewWeather')?.[0]).toEqual([
      expect.objectContaining({
        temperature: 15,
        humidity: 86,
        windSpeed: 6.5,
        windDirectionDegrees: 160,
        aqi: 25,
        cloudCover: 88,
        precipitation: 7.2,
        visibility: 17.2,
      }),
    ])

    await wrapper.findAll('button[aria-label="Close settings"]')[1].trigger('click')

    expect(wrapper.text()).not.toContain('날씨 시뮬레이션 (Lab)')
  })

  it('설정 패널의 현재 날씨 렌더링 이벤트를 상위로 전달해야 한다', async () => {
    const wrapper = mount(DashboardOverlay, {
      props: baseProps,
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    await wrapper.find('button[aria-label="Open settings"]').trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '실시간 날씨 반영')
      ?.trigger('click')

    expect(wrapper.emitted('renderCurrentWeather')).toHaveLength(1)
  })

  it('만료 캐시 경고는 원본 오류 대신 재시도 버튼과 함께 표시해야 한다', async () => {
    const wrapper = mount(DashboardOverlay, {
      props: {
        ...baseProps,
        weatherDataSource: 'stale-cache',
        weatherErrorMessage: 'WeatherAPI provider internal detail',
      },
    })

    const alert = wrapper.get('[data-testid="weather-sync-alert"]')
    expect(alert.text()).toContain('저장된 날씨를 계속 표시합니다.')
    expect(alert.text()).not.toContain('WeatherAPI provider internal detail')

    await wrapper.get('button[aria-label="날씨 동기화 다시 시도"]').trigger('click')

    expect(wrapper.emitted('retryWeather')).toHaveLength(1)
  })

  it('날씨 재시도 중에는 재시도 버튼을 비활성화해야 한다', () => {
    const wrapper = mount(DashboardOverlay, {
      props: {
        ...baseProps,
        weatherErrorMessage: 'request failed',
        weatherIsLoading: true,
      },
    })

    const retryButton = wrapper.get('button[aria-label="날씨 동기화 다시 시도"]')
    expect(retryButton.attributes('disabled')).toBeDefined()
    expect(retryButton.text()).toBe('업데이트 중')
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

  it('선택 지역 id가 목록에 없으면 첫 번째 지역을 시간 컨트롤에 사용해야 한다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-27T03:15:00.000Z'))
    const wrapper = mount(DashboardOverlay, {
      props: {
        ...baseProps,
        selectedLocationId: 'missing-location',
        'onUpdate:time': (value: number) => wrapper.setProps({ time: value }),
      },
    })

    await wrapper.find('button[title="현재 시간으로 리셋"]').trigger('click')

    expect(wrapper.emitted('setTime')?.[0]).toEqual([12.3])
    vi.useRealTimers()
  })

  it('빈 대시보드 프레임은 배경 씬을 가리지 않고, 패널만 포인터 이벤트를 받아야 한다', () => {
    const wrapper = mount(DashboardOverlay, {
      props: baseProps,
    })
    const frame = wrapper.find('.dashboard-frame')

    expect(frame.classes()).toContain('pointer-events-none')
    expect(wrapper.findAll('aside').some((panel) => panel.classes().includes('pointer-events-auto'))).toBe(true)
  })
})
