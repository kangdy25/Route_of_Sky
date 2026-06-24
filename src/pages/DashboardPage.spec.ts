import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWeatherStore } from '@/features/weather/model/weather.store'
import DashboardPage from './DashboardPage.vue'

const flyToLocation = vi.fn()

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
          emits: ['flyToJamsil', 'update:time'],
          setup(props, { emit }) {
            const summary = computed(
              () => `${props.temperature}/${props.precipitation}/${props.visibility}`,
            )

            return () =>
              h('div', { 'data-testid': 'dashboard-overlay' }, [
                h('span', summary.value),
                h(
                  'button',
                  { 'data-testid': 'fly-to-jamsil', onClick: () => emit('flyToJamsil') },
                  'Fly',
                ),
                h(
                  'button',
                  { 'data-testid': 'set-time', onClick: () => emit('update:time', 8) },
                  'Set time',
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
  })

  it('기본 날씨 상태와 테스트 패널을 렌더링해야 한다', () => {
    const { wrapper } = mountDashboardPage()

    expect(wrapper.find('[data-testid="scene-canvas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-overlay"]').text()).toContain('24.5/0/15')
    expect(wrapper.text()).toContain('Weather test')
    expect(wrapper.text()).toContain('Precipitation')
    expect(wrapper.text()).toContain('0.0 mm/h')
  })

  it('비 프리뷰 버튼은 비 상태를 반영해야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Rain')
      ?.trigger('click')

    expect(store.temperature).toBe(24.5)
    expect(store.cloudCover).toBe(88)
    expect(store.precipitation).toBe(9.5)
    expect(store.windSpeed).toBe(7)
    expect(store.windDirectionDegrees).toBe(215)
    expect(store.humidity).toBe(82)
    expect(store.aqi).toBe(86)
    expect(store.visibility).toBeLessThan(15)
  })

  it('폭풍 조건이면 비 버튼 라벨을 Storm으로 바꿔야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()

    store.precipitation = 12
    store.cloudCover = 88
    await nextTick()

    expect(wrapper.text()).toContain('Storm')
  })

  it('눈 프리뷰 버튼은 눈 상태와 단위를 반영해야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Snow')
      ?.trigger('click')

    expect(store.temperature).toBe(-4)
    expect(store.cloudCover).toBe(92)
    expect(store.precipitation).toBe(5.5)
    expect(store.windSpeed).toBe(5)
    expect(store.windDirectionDegrees).toBe(30)
    expect(store.humidity).toBe(88)
    expect(store.aqi).toBe(72)
    expect(wrapper.text()).toContain('Snowfall')
    expect(wrapper.text()).toContain('cm/h')
  })

  it('Clear 버튼은 기본 맑은 상태로 되돌려야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Snow')
      ?.trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Clear')
      ?.trigger('click')

    expect(store.temperature).toBe(24.5)
    expect(store.cloudCover).toBe(12)
    expect(store.precipitation).toBe(0)
    expect(store.windSpeed).toBe(3)
    expect(store.windDirectionDegrees).toBe(225)
    expect(store.humidity).toBe(48)
    expect(store.aqi).toBe(38)
    expect(wrapper.text()).toContain('Precipitation')
    expect(wrapper.text()).toContain('mm/h')
  })

  it('AQI 입력은 대기질과 가시거리를 함께 동기화해야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()
    const aqiInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('AQI'))
      ?.find('input')

    await aqiInput?.setValue('300')

    expect(store.aqi).toBe(300)
    expect(store.visibility).toBe(2.9)
  })

  it('날씨 테스트 슬라이더 입력을 store에 반영해야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()
    const findInputByLabel = (labelText: string) =>
      wrapper
        .findAll('label')
        .find((label) => label.text().includes(labelText))
        ?.find('input')

    await findInputByLabel('Precipitation')?.setValue('6.5')
    await findInputByLabel('Temperature')?.setValue('-2.5')
    await findInputByLabel('Cloud')?.setValue('77')
    await findInputByLabel('Wind')?.setValue('11.5')
    await findInputByLabel('Wind angle')?.setValue('180')
    await findInputByLabel('Humidity')?.setValue('91')

    expect(store.precipitation).toBe(6.5)
    expect(store.temperature).toBe(-2.5)
    expect(store.cloudCover).toBe(77)
    expect(store.windSpeed).toBe(11.5)
    expect(store.windDirectionDegrees).toBe(180)
    expect(store.humidity).toBe(91)
  })

  it('가시거리 계산은 최소 1km 아래로 내려가지 않아야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()
    store.precipitation = 16
    store.cloudCover = 100
    await nextTick()
    const aqiInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('AQI'))
      ?.find('input')

    await aqiInput?.setValue('300')

    expect(store.visibility).toBe(1)
  })

  it('오버레이 시간 업데이트를 store에 반영해야 한다', async () => {
    const { wrapper, store } = mountDashboardPage()

    await wrapper.find('[data-testid="set-time"]').trigger('click')

    expect(store.time).toBe(8)
  })

  it('오버레이 비행 이벤트를 SceneCanvas로 전달해야 한다', async () => {
    const { wrapper } = mountDashboardPage()

    await wrapper.find('[data-testid="fly-to-jamsil"]').trigger('click')

    expect(flyToLocation).toHaveBeenCalledWith({
      longitude: 127.1026,
      latitude: 37.5125,
      height: 1350,
      headingDegrees: 314,
      pitchDegrees: -42,
      duration: 3.4,
    })
  })
})
