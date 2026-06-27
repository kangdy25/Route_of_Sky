import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWeatherStore } from '@/features/weather/model/weather.store'
import DashboardPage from './DashboardPage.vue'

const flyToLocation = vi.fn()
const loadCurrentWeather = vi.fn()

vi.mock('@/features/weather/model/weather.store', async () => {
  const actual = await vi.importActual<typeof import('@/features/weather/model/weather.store')>(
    '@/features/weather/model/weather.store',
  )

  return {
    ...actual,
    useWeatherStore: () => {
      const store = actual.useWeatherStore()

      store.loadCurrentWeather = loadCurrentWeather

      return store
    },
  }
})

function mountDashboardPage() {
  setActivePinia(createPinia())
  flyToLocation.mockClear()

  const wrapper = mount(DashboardPage, {
    global: {
      stubs: {
        SceneCanvas: defineComponent({
          props: ['location'],
          name: 'SceneCanvas',
          setup(_, { expose }) {
            expose({ flyToLocation })
            return () => h('div', { 'data-testid': 'scene-canvas' })
          },
        }),
        DashboardOverlay: defineComponent({
          props: [
            'time',
            'temperature',
            'temperatureMin',
            'temperatureMax',
            'humidity',
            'windSpeed',
            'windDirectionDegrees',
            'aqi',
            'cloudCover',
            'precipitation',
            'visibility',
            'locations',
            'selectedLocationId',
          ],
          emits: [
            'flyToSelectedLocation',
            'selectLocation',
            'renderCurrentWeather',
            'update:time',
            'update:temperature',
            'update:humidity',
            'update:windSpeed',
            'update:windDirectionDegrees',
            'update:aqi',
            'update:cloudCover',
            'update:precipitation',
            'update:visibility',
          ],
          setup(props, { emit }) {
            const summary = computed(
              () => `${props.temperature}/${props.precipitation}/${props.visibility}`,
            )

            return () =>
              h('div', { 'data-testid': 'dashboard-overlay' }, [
                h('span', summary.value),
                h(
                  'button',
                  {
                    'data-testid': 'fly-to-selected-location',
                    onClick: () => emit('flyToSelectedLocation'),
                  },
                  'Fly',
                ),
                h(
                  'button',
                  {
                    'data-testid': 'select-jerusalem',
                    onClick: () => emit('selectLocation', 'il-jerusalem'),
                  },
                  'Jerusalem',
                ),
                h(
                  'button',
                  {
                    'data-testid': 'select-missing-location',
                    onClick: () => emit('selectLocation', 'missing-location'),
                  },
                  'Missing location',
                ),
                h(
                  'button',
                  {
                    'data-testid': 'render-current-weather',
                    onClick: () => emit('renderCurrentWeather'),
                  },
                  'Render current weather',
                ),
                h(
                  'button',
                  { 'data-testid': 'set-time', onClick: () => emit('update:time', 8) },
                  'Set time',
                ),
                h(
                  'button',
                  {
                    'data-testid': 'set-temperature',
                    onClick: () => emit('update:temperature', -3),
                  },
                  'Set temperature',
                ),
                h(
                  'button',
                  {
                    'data-testid': 'set-weather-values',
                    onClick: () => {
                      emit('update:humidity', 70)
                      emit('update:windSpeed', 8)
                      emit('update:windDirectionDegrees', 90)
                      emit('update:aqi', 22)
                      emit('update:cloudCover', 44)
                      emit('update:precipitation', 1.5)
                      emit('update:visibility', 19)
                    },
                  },
                  'Set weather values',
                ),
              ])
          },
        }),
      },
    },
  })

  return { wrapper, store: useWeatherStore() }
}

describe('대시보드 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    loadCurrentWeather.mockResolvedValue(false)
  })

  it('기본 날씨 상태와 대시보드 오버레이를 렌더링해야 한다', () => {
    const { wrapper } = mountDashboardPage()

    expect(wrapper.find('[data-testid="scene-canvas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-overlay"]').text()).toContain('24.5/0/15')
    expect(loadCurrentWeather).toHaveBeenCalledWith('40.758,-73.9855')
  })

  it('오버레이 시간 업데이트를 store에 반영해야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()

    await wrapper.find('[data-testid="set-time"]').trigger('click')

    expect(store.time).toBe(8)
  })

  it('오버레이 날씨 업데이트를 store에 반영해야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()

    await wrapper.find('[data-testid="set-temperature"]').trigger('click')

    expect(store.temperature).toBe(-3)
  })

  it('오버레이 상세 날씨 업데이트를 store에 반영해야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()

    await wrapper.find('[data-testid="set-weather-values"]').trigger('click')

    expect(store.humidity).toBe(70)
    expect(store.windSpeed).toBe(8)
    expect(store.windDirectionDegrees).toBe(90)
    expect(store.aqi).toBe(22)
    expect(store.cloudCover).toBe(44)
    expect(store.precipitation).toBe(1.5)
    expect(store.visibility).toBe(19)
  })

  it('오버레이 비행 이벤트를 현재 선택된 지역으로 전달해야 한다', async () => {
    const { wrapper } = mountDashboardPage()

    await wrapper.find('[data-testid="fly-to-selected-location"]').trigger('click')

    expect(flyToLocation).toHaveBeenCalledWith({
      longitude: -73.9855,
      latitude: 40.758,
      height: 1650,
      headingDegrees: 28,
      pitchDegrees: -38,
      duration: 3.4,
    })
  })

  it('오버레이 지역 선택 이벤트를 SceneCanvas 이동과 선택 상태에 반영해야 한다', async () => {
    const { wrapper } = mountDashboardPage()

    await wrapper.find('[data-testid="select-jerusalem"]').trigger('click')

    expect(flyToLocation).toHaveBeenCalledWith({
      longitude: 35.2345,
      latitude: 31.7767,
      height: 1650,
      headingDegrees: 28,
      pitchDegrees: -38,
      duration: 3.4,
    })
    expect(wrapper.findComponent({ name: 'SceneCanvas' }).props('location')).toMatchObject({
      id: 'il-jerusalem',
      label: '이스라엘',
      city: '예루살렘',
      landmark: '통곡의 벽',
    })
    expect(loadCurrentWeather).toHaveBeenLastCalledWith('31.7767,35.2345')
    expect(window.localStorage.getItem('route-of-sky:selected-location-id')).toBe('il-jerusalem')
  })

  it('저장된 지역이 있으면 새로고침 후에도 해당 지역으로 초기화해야 한다', () => {
    window.localStorage.setItem('route-of-sky:selected-location-id', 'jp-tokyo')

    const { wrapper } = mountDashboardPage()

    expect(wrapper.findComponent({ name: 'SceneCanvas' }).props('location')).toMatchObject({
      id: 'jp-tokyo',
      label: '일본',
      city: '도쿄',
    })
    expect(loadCurrentWeather).toHaveBeenCalledWith('35.6586,139.7454')
  })

  it('저장된 지역이 유효하지 않으면 기본 뉴욕 지역으로 초기화해야 한다', () => {
    window.localStorage.setItem('route-of-sky:selected-location-id', 'unknown')

    const { wrapper } = mountDashboardPage()

    expect(wrapper.findComponent({ name: 'SceneCanvas' }).props('location')).toMatchObject({
      id: 'us-new-york',
    })
    expect(loadCurrentWeather).toHaveBeenCalledWith('40.758,-73.9855')
  })

  it('저장소를 읽을 수 없으면 기본 뉴욕 지역으로 초기화해야 한다', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    const { wrapper } = mountDashboardPage()

    expect(wrapper.findComponent({ name: 'SceneCanvas' }).props('location')).toMatchObject({
      id: 'us-new-york',
    })
    expect(loadCurrentWeather).toHaveBeenCalledWith('40.758,-73.9855')

    getItemSpy.mockRestore()
  })

  it('저장소에 쓸 수 없어도 지역 선택은 현재 세션 상태에 반영해야 한다', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    const { wrapper } = mountDashboardPage()

    await wrapper.find('[data-testid="select-jerusalem"]').trigger('click')

    expect(wrapper.findComponent({ name: 'SceneCanvas' }).props('location')).toMatchObject({
      id: 'il-jerusalem',
    })
    expect(loadCurrentWeather).toHaveBeenLastCalledWith('31.7767,35.2345')

    setItemSpy.mockRestore()
  })

  it('지역 변경 후 비행 버튼을 누르면 변경된 지역으로 다시 이동해야 한다', async () => {
    const { wrapper } = mountDashboardPage()

    await wrapper.find('[data-testid="select-jerusalem"]').trigger('click')
    flyToLocation.mockClear()
    await wrapper.find('[data-testid="fly-to-selected-location"]').trigger('click')

    expect(flyToLocation).toHaveBeenCalledWith({
      longitude: 35.2345,
      latitude: 31.7767,
      height: 1650,
      headingDegrees: 28,
      pitchDegrees: -38,
      duration: 3.4,
    })
  })

  it('현재 날씨 렌더링 이벤트를 받으면 선택된 지역의 실제 날씨를 다시 불러와야 한다', async () => {
    const { wrapper } = mountDashboardPage()
    loadCurrentWeather.mockClear()

    await wrapper.find('[data-testid="render-current-weather"]').trigger('click')

    expect(loadCurrentWeather).toHaveBeenCalledWith('40.758,-73.9855')
  })

  it('알 수 없는 지역 선택 이벤트는 무시해야 한다', async () => {
    const { wrapper } = mountDashboardPage()

    await wrapper.find('[data-testid="select-missing-location"]').trigger('click')

    expect(flyToLocation).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'SceneCanvas' }).props('location')).toMatchObject({
      id: 'us-new-york',
    })
    expect(loadCurrentWeather).toHaveBeenCalledTimes(1)
  })
})
