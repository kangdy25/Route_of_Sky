import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WORLD_LOCATIONS } from '@/features/scene/model/scene.constants'
import SettingsPanel from './SettingsPanel.vue'

function mountSettingsPanel(open = true, location = WORLD_LOCATIONS[1]) {
  const state = reactive({
    time: 16.5,
    temperature: 24.5,
    humidity: 62,
    windSpeed: 5,
    windDirectionDegrees: 225,
    aqi: 45,
    cloudCover: 35,
    precipitation: 0,
    visibility: 15,
    qualityMode: 'auto' as 'auto' | 'high' | 'medium' | 'low',
  })

  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(SettingsPanel, {
            open,
            time: state.time,
            temperature: state.temperature,
            humidity: state.humidity,
            windSpeed: state.windSpeed,
            windDirectionDegrees: state.windDirectionDegrees,
            aqi: state.aqi,
            cloudCover: state.cloudCover,
            precipitation: state.precipitation,
            visibility: state.visibility,
            location,
            qualityMode: state.qualityMode,
            effectiveQuality: 'medium',
            'onUpdate:time': (value: number) => {
              state.time = value
            },
            'onUpdate:temperature': (value: number) => {
              state.temperature = value
            },
            'onUpdate:humidity': (value: number) => {
              state.humidity = value
            },
            'onUpdate:windSpeed': (value: number) => {
              state.windSpeed = value
            },
            'onUpdate:windDirectionDegrees': (value: number) => {
              state.windDirectionDegrees = value
            },
            'onUpdate:aqi': (value: number) => {
              state.aqi = value
            },
            'onUpdate:cloudCover': (value: number) => {
              state.cloudCover = value
            },
            'onUpdate:precipitation': (value: number) => {
              state.precipitation = value
            },
            'onUpdate:visibility': (value: number) => {
              state.visibility = value
            },
            'onUpdate:qualityMode': (value: 'auto' | 'high' | 'medium' | 'low') => {
              state.qualityMode = value
            },
            onPreviewWeather: (patch: Partial<typeof state>) => {
              Object.assign(state, patch)
            },
            onSetTime: (value: number) => {
              state.time = value
            },
          })
      },
    }),
    {
      global: {
        stubs: {
          teleport: true,
        },
      },
    },
  )

  return { wrapper, state }
}

describe('설정 패널', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('날씨 실험실 설정을 렌더링해야 한다', () => {
    const { wrapper } = mountSettingsPanel()

    expect(wrapper.text()).toContain('환경설정')
    expect(wrapper.text()).toContain('시간대 설정')
    expect(wrapper.text()).toContain('날씨 시뮬레이션 (Lab)')
    expect(wrapper.text()).toContain('실시간 날씨 반영')
    expect(wrapper.text()).toContain('맑음')
    expect(wrapper.text()).toContain('강수량')
    expect(wrapper.text()).toContain('0.0 mm/h')
    expect(wrapper.text()).toContain('적용: MEDIUM')
  })

  it('AQI 슬라이더 라벨은 정수로 표시해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    state.aqi = 80.74
    await nextTick()

    const aqiLabel = wrapper.findAll('label').find((label) => label.text().includes('AQI'))
    expect(aqiLabel?.text()).toContain('81')
    expect(aqiLabel?.text()).not.toContain('80.74')
  })

  it('날씨 전환 중 기온, 습도, 풍속은 소수점 한 자리로 표시해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    state.temperature = 24.63
    state.humidity = 61.54
    state.windSpeed = 5.56
    await nextTick()

    expect(wrapper.text()).toContain('24.6°C')
    expect(wrapper.text()).toContain('62%')
    expect(wrapper.text()).toContain('5.6 m/s')
    expect(wrapper.text()).not.toContain('24.63°C')
    expect(wrapper.text()).not.toContain('61.54%')
    expect(wrapper.text()).not.toContain('5.56 m/s')
  })

  it('렌더링 품질을 수동 단계로 변경해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper.find('select[aria-label="렌더링 품질"]').setValue('low')

    expect(state.qualityMode).toBe('low')
  })

  it('시간 프리셋과 슬라이더 입력을 상태에 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '밤')
      ?.trigger('click')

    expect(state.time).toBe(22.5)

    const timeInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('시간 조절'))
      ?.find('input')

    await timeInput?.setValue('6.2')

    expect(state.time).toBe(6.2)
    expect(wrapper.text()).toContain('06:12')
  })

  it('현재 시간 버튼은 선택 도시의 현재 현지 시간을 반영해야 한다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-27T03:15:00.000Z'))
    const { wrapper, state } = mountSettingsPanel(true, WORLD_LOCATIONS[2])

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '현재 시각 반영')
      ?.trigger('click')

    expect(state.time).toBe(12.3)
  })

  it('현재 날씨 렌더링 버튼은 현재 날씨 이벤트를 발생시켜야 한다', async () => {
    const { wrapper } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '실시간 날씨 반영')
      ?.trigger('click')

    expect(wrapper.findComponent(SettingsPanel).emitted('renderCurrentWeather')).toHaveLength(1)
  })

  it('비 프리뷰 버튼은 비 상태를 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '비')
      ?.trigger('click')

    expect(state.temperature).toBe(15)
    expect(state.cloudCover).toBe(88)
    expect(state.precipitation).toBe(7.2)
    expect(state.windSpeed).toBe(6.5)
    expect(state.windDirectionDegrees).toBe(160)
    expect(state.humidity).toBe(86)
    expect(state.aqi).toBe(25)
    expect(state.visibility).toBe(17.2)
  })

  it('폭풍 프리셋은 강한 비와 바람 상태를 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '폭풍우')
      ?.trigger('click')

    expect(state.temperature).toBe(23)
    expect(state.cloudCover).toBe(100)
    expect(state.precipitation).toBe(16)
    expect(state.windSpeed).toBe(14)
    expect(state.windDirectionDegrees).toBe(225)
    expect(state.humidity).toBe(94)
    expect(state.aqi).toBe(35)
    expect(state.visibility).toBe(12.4)
  })

  it('눈 프리뷰 버튼은 눈 상태와 단위를 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '눈')
      ?.trigger('click')

    expect(state.temperature).toBe(-7)
    expect(state.cloudCover).toBe(92)
    expect(state.precipitation).toBe(4.8)
    expect(state.windSpeed).toBe(5.5)
    expect(state.windDirectionDegrees).toBe(30)
    expect(state.humidity).toBe(90)
    expect(state.aqi).toBe(20)
    expect(state.visibility).toBe(18.4)
    expect(wrapper.text()).toContain('적설량')
    expect(wrapper.text()).toContain('cm/h')
  })

  it('Sunny 버튼은 맑은 상태를 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '눈')
      ?.trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '맑음')
      ?.trigger('click')

    expect(state.temperature).toBe(22)
    expect(state.cloudCover).toBe(8)
    expect(state.precipitation).toBe(0)
    expect(state.windSpeed).toBe(2.8)
    expect(state.windDirectionDegrees).toBe(240)
    expect(state.humidity).toBe(42)
    expect(state.aqi).toBe(32)
    expect(state.visibility).toBe(20.5)
    expect(wrapper.text()).toContain('강수량')
    expect(wrapper.text()).toContain('mm/h')
  })

  it('연무 프리셋은 높은 AQI와 낮은 시정을 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '미세먼지')
      ?.trigger('click')

    expect(state.precipitation).toBe(0)
    expect(state.temperature).toBe(27)
    expect(state.windSpeed).toBe(1.5)
    expect(state.windDirectionDegrees).toBe(270)
    expect(state.humidity).toBe(66)
    expect(state.cloudCover).toBe(62)
    expect(state.aqi).toBe(260)
    expect(state.visibility).toBe(5.8)
  })

  it('AQI 입력은 대기질과 가시거리를 함께 동기화해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()
    const aqiInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('AQI'))
      ?.find('input')

    await aqiInput?.setValue('300')

    expect(state.aqi).toBe(300)
    expect(state.visibility).toBe(2.9)
  })

  it('날씨 슬라이더 입력을 상태에 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()
    const findInputByLabel = (labelText: string) =>
      wrapper
        .findAll('label')
        .find((label) => label.text().includes(labelText))
        ?.find('input')

    await findInputByLabel('강수량')?.setValue('6.5')
    await findInputByLabel('기온')?.setValue('-2.5')
    await findInputByLabel('운량 (구름)')?.setValue('77')
    await findInputByLabel('풍속')?.setValue('11.5')
    await findInputByLabel('풍향')?.setValue('180')
    await findInputByLabel('습도')?.setValue('91')

    expect(state.precipitation).toBe(6.5)
    expect(state.temperature).toBe(-2.5)
    expect(state.cloudCover).toBe(77)
    expect(state.windSpeed).toBe(11.5)
    expect(state.windDirectionDegrees).toBe(180)
    expect(state.humidity).toBe(91)
  })

  it('기온 슬라이더는 -20도부터 40도까지 조정할 수 있어야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()
    const temperatureInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('기온'))
      ?.find('input')

    expect(temperatureInput?.attributes('min')).toBe('-20')
    expect(temperatureInput?.attributes('max')).toBe('40')

    await temperatureInput?.setValue('-20')
    expect(state.temperature).toBe(-20)

    await temperatureInput?.setValue('40')
    expect(state.temperature).toBe(40)
  })

  it('모든 시간 프리셋 버튼을 상태에 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '새벽')
      ?.trigger('click')
    expect(state.time).toBe(6.2)

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '정오')
      ?.trigger('click')
    expect(state.time).toBe(12)

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '일몰')
      ?.trigger('click')
    expect(state.time).toBe(18.6)
  })

  it('배경과 닫기 버튼은 close 이벤트를 발생시켜야 한다', async () => {
    const { wrapper } = mountSettingsPanel()
    const closeButtons = wrapper.findAll('button[aria-label="Close settings"]')

    await closeButtons[0].trigger('click')
    await closeButtons[1].trigger('click')

    expect(wrapper.findComponent(SettingsPanel).emitted('close')).toHaveLength(2)
  })

  it('가시거리 계산은 최소 1km 아래로 내려가지 않아야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()
    state.precipitation = 16
    state.cloudCover = 100
    await nextTick()
    const aqiInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('AQI'))
      ?.find('input')

    await aqiInput?.setValue('300')

    expect(state.visibility).toBe(1)
  })

  it('자동 가시거리를 끄면 Visibility를 수동으로 조정해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()
    const autoVisibilityInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('가시거리 자동 연동'))
      ?.find('input')

    await autoVisibilityInput?.setValue(false)
    await nextTick()

    const visibilityInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('가시거리'))
      ?.find('input')

    await visibilityInput?.setValue('4.5')

    expect(state.visibility).toBe(4.5)

    const aqiInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('AQI'))
      ?.find('input')

    await aqiInput?.setValue('300')

    expect(state.visibility).toBe(4.5)

    await autoVisibilityInput?.setValue(true)

    expect(state.visibility).toBe(2.9)
  })

  it('패널이 닫혀 있으면 API로 들어온 가시거리를 자동 계산값으로 덮어쓰지 않아야 한다', async () => {
    const { state } = mountSettingsPanel(false)

    state.visibility = 16
    state.aqi = 45
    state.cloudCover = 35
    state.precipitation = 0
    await nextTick()

    expect(state.visibility).toBe(16)
  })
})
