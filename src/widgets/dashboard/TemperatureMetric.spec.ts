import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TemperatureMetric from './TemperatureMetric.vue'

const baseProps = {
  temperatureMin: 12,
  temperatureMax: 31,
}

describe('기온 지표 카드', () => {
  it('영하권이면 결빙 위험 상태와 설명을 렌더링해야 한다', () => {
    const wrapper = mount(TemperatureMetric, { props: { ...baseProps, temperature: -4 } })

    expect(wrapper.text()).toContain('결빙 위험 ↘')
    expect(wrapper.text()).toContain('결빙')
    expect(wrapper.text()).toContain('영하권 기온으로 강수가 눈으로 바뀌며 결빙 가능성이 높습니다.')
  })

  it('낮은 기온이면 저온 상태와 설명을 렌더링해야 한다', () => {
    const wrapper = mount(TemperatureMetric, { props: { ...baseProps, temperature: 6 } })

    expect(wrapper.text()).toContain('차가운 공기 ↘')
    expect(wrapper.text()).toContain('저온')
    expect(wrapper.text()).toContain(
      '낮은 기온으로 공기 밀도가 높고 체감 조건이 차갑게 유지됩니다.',
    )
  })

  it('안정 기온이면 쾌적한 상태와 설명을 렌더링해야 한다', () => {
    const wrapper = mount(TemperatureMetric, { props: { ...baseProps, temperature: 24.5 } })

    expect(wrapper.text()).toContain('쾌적한 기온 ↗')
    expect(wrapper.text()).toContain('안정')
    expect(wrapper.text()).toContain('현재 고도에서 열 변화가 안정적으로 유지되고 있습니다.')
  })

  it('오늘 최저/최고 기온을 기준 범위와 요약 값으로 표시해야 한다', () => {
    const wrapper = mount(TemperatureMetric, {
      props: { temperature: 24.5, temperatureMin: 17.2, temperatureMax: 29.8 },
    })

    expect(wrapper.text()).toContain('17.2°')
    expect(wrapper.text()).toContain('29.8°')
  })

  it('높은 기온이면 고온 상태와 설명을 렌더링해야 한다', () => {
    const wrapper = mount(TemperatureMetric, { props: { ...baseProps, temperature: 32 } })

    expect(wrapper.text()).toContain('고온 상승 ↗')
    expect(wrapper.text()).toContain('고온')
    expect(wrapper.text()).toContain('높은 기온으로 열 상승과 지표 난류가 강해질 수 있습니다.')
  })

  it('온도 진행 막대 값은 0에서 100 사이로 제한해야 한다', () => {
    const lowWrapper = mount(TemperatureMetric, {
      props: { temperature: -20, temperatureMin: 0, temperatureMax: 30 },
    })
    const highWrapper = mount(TemperatureMetric, {
      props: { temperature: 60, temperatureMin: 0, temperatureMax: 30 },
    })

    expect(lowWrapper.find('.bg-gradient-to-r').attributes('style')).toContain('width: 0%;')
    expect(highWrapper.find('.bg-gradient-to-r').attributes('style')).toContain('width: 100%;')
  })

  it('최저/최고 기온이 같으면 진행 막대를 가득 채워야 한다', () => {
    const wrapper = mount(TemperatureMetric, {
      props: { temperature: 12, temperatureMin: 12, temperatureMax: 12 },
    })

    expect(wrapper.find('.bg-gradient-to-r').attributes('style')).toContain('width: 100%;')
  })
})
