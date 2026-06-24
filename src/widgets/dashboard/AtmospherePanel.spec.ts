import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AtmospherePanel from './AtmospherePanel.vue'

describe('대기질 정보 패널', () => {
  const cases = [
    { aqi: 45, level: '매우 좋음', range: '정상 범위', className: 'text-cyan-300' },
    { aqi: 80, level: '보통', range: '관리 범위', className: 'text-lime-300' },
    { aqi: 125, level: '민감군 주의', range: '주의 범위', className: 'text-yellow-300' },
    { aqi: 180, level: '나쁨', range: '시정 저하', className: 'text-orange-300' },
    { aqi: 230, level: '매우 나쁨', range: '위험 범위', className: 'text-red-400' },
    { aqi: 290, level: '매우 나쁨', range: '강한 연무', className: 'text-zinc-500' },
  ]

  it.each(cases)('AQI $aqi 상태를 렌더링해야 한다', ({ aqi, level, range, className }) => {
    const wrapper = mount(AtmospherePanel, { props: { aqi } })

    expect(wrapper.text()).toContain(`지수: ${aqi}`)
    expect(wrapper.text()).toContain(level)
    expect(wrapper.text()).toContain(range)
    expect(wrapper.find(`.${className}`).exists()).toBe(true)
  })

  it('AQI 진행 막대 값은 0에서 300 사이로 제한해야 한다', () => {
    const lowWrapper = mount(AtmospherePanel, { props: { aqi: -40 } })
    const highWrapper = mount(AtmospherePanel, { props: { aqi: 420 } })

    expect(lowWrapper.find('.absolute.top-0.left-0').attributes('style')).toContain('width: 0%;')
    expect(highWrapper.find('.absolute.top-0.left-0').attributes('style')).toContain('width: 100%;')
  })
})
