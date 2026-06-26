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
          setup(_, { expose }) {
            expose({ flyToLocation })
            return () => h('div', { 'data-testid': 'scene-canvas' })
          },
        }),
        DashboardOverlay: defineComponent({
          props: [
            'time',
            'temperature',
            'humidity',
            'windSpeed',
            'windDirectionDegrees',
            'aqi',
            'cloudCover',
            'precipitation',
            'visibility',
          ],
          emits: [
            'flyToTimesSquare',
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
                    'data-testid': 'fly-to-times-square',
                    onClick: () => emit('flyToTimesSquare'),
                  },
                  'Fly',
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
    loadCurrentWeather.mockResolvedValue(false)
  })

  it('기본 날씨 상태와 대시보드 오버레이를 렌더링해야 한다', () => {
    const { wrapper } = mountDashboardPage()

    expect(wrapper.find('[data-testid="scene-canvas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-overlay"]').text()).toContain('24.5/0/15')
    expect(loadCurrentWeather).toHaveBeenCalledTimes(1)
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

  it('오버레이 타임스퀘어 비행 이벤트를 SceneCanvas로 전달해야 한다', async () => {
    const { wrapper } = mountDashboardPage()

    await wrapper.find('[data-testid="fly-to-times-square"]').trigger('click')

    expect(flyToLocation).toHaveBeenCalledWith({
      longitude: -73.9855,
      latitude: 40.758,
      height: 1350,
      headingDegrees: 28,
      pitchDegrees: -38,
      duration: 3.4,
    })
  })
})
