import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import SettingsPanel from './SettingsPanel.vue'

function mountSettingsPanel(open = true) {
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
  it('날씨 실험실 설정을 렌더링해야 한다', () => {
    const { wrapper } = mountSettingsPanel()

    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Scene Time')
    expect(wrapper.text()).toContain('Weather Lab')
    expect(wrapper.text()).toContain('Sunny')
    expect(wrapper.text()).toContain('Precipitation')
    expect(wrapper.text()).toContain('0.0 mm/h')
  })

  it('시간 프리셋과 슬라이더 입력을 상태에 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Night')
      ?.trigger('click')

    expect(state.time).toBe(22.5)

    const timeInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('Time scrubber'))
      ?.find('input')

    await timeInput?.setValue('6.2')

    expect(state.time).toBe(6.2)
    expect(wrapper.text()).toContain('06:12')
  })

  it('비 프리뷰 버튼은 비 상태를 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Rain')
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
      .find((button) => button.text() === 'Storm')
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
      .find((button) => button.text() === 'Snow')
      ?.trigger('click')

    expect(state.temperature).toBe(-7)
    expect(state.cloudCover).toBe(92)
    expect(state.precipitation).toBe(4.8)
    expect(state.windSpeed).toBe(5.5)
    expect(state.windDirectionDegrees).toBe(30)
    expect(state.humidity).toBe(90)
    expect(state.aqi).toBe(20)
    expect(state.visibility).toBe(18.4)
    expect(wrapper.text()).toContain('Snowfall')
    expect(wrapper.text()).toContain('cm/h')
  })

  it('Sunny 버튼은 맑은 상태를 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Snow')
      ?.trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Sunny')
      ?.trigger('click')

    expect(state.temperature).toBe(22)
    expect(state.cloudCover).toBe(8)
    expect(state.precipitation).toBe(0)
    expect(state.windSpeed).toBe(2.8)
    expect(state.windDirectionDegrees).toBe(240)
    expect(state.humidity).toBe(42)
    expect(state.aqi).toBe(32)
    expect(state.visibility).toBe(20.5)
    expect(wrapper.text()).toContain('Precipitation')
    expect(wrapper.text()).toContain('mm/h')
  })

  it('연무 프리셋은 높은 AQI와 낮은 시정을 반영해야 한다', async () => {
    const { wrapper, state } = mountSettingsPanel()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Haze')
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

    await findInputByLabel('Precipitation')?.setValue('6.5')
    await findInputByLabel('Temperature')?.setValue('-2.5')
    await findInputByLabel('Cloud')?.setValue('77')
    await findInputByLabel('Wind')?.setValue('11.5')
    await findInputByLabel('Wind angle')?.setValue('180')
    await findInputByLabel('Humidity')?.setValue('91')

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
      .find((label) => label.text().includes('Temperature'))
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
      .find((button) => button.text() === 'Dawn')
      ?.trigger('click')
    expect(state.time).toBe(6.2)

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Noon')
      ?.trigger('click')
    expect(state.time).toBe(12)

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Sunset')
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
      .find((label) => label.text().includes('Auto visibility'))
      ?.find('input')

    await autoVisibilityInput?.setValue(false)
    await nextTick()

    const visibilityInput = wrapper
      .findAll('label')
      .find((label) => label.text().includes('Visibility'))
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
