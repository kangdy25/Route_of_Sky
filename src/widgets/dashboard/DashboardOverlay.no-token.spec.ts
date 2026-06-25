import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DashboardOverlay from './DashboardOverlay.vue'

vi.mock('@/shared/config/env', () => ({
  hasCesiumIonAccessToken: false,
}))

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn(),
  },
}))

const props = {
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

describe('DashboardOverlay without Cesium token', () => {
  it('Cesium ion 토큰 설정 안내를 보여줘야 한다', () => {
    const wrapper = mount(DashboardOverlay, { props })

    expect(wrapper.text()).toContain('Google Photorealistic 3D Tiles 활성화 가능')
    expect(wrapper.text()).toContain('VITE_CESIUM_ION_ACCESS_TOKEN')
  })
})
