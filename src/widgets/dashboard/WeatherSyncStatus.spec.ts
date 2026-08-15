import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WeatherSyncStatus from './WeatherSyncStatus.vue'

const updatedAt = new Date('2026-08-15T09:30:00').getTime()

describe('날씨 동기화 상태', () => {
  it('로딩 상태를 접근 가능한 상태 영역으로 표시해야 한다', () => {
    const wrapper = mount(WeatherSyncStatus, {
      props: { isLoading: true },
    })

    expect(wrapper.get('[data-testid="weather-sync-status"]').text()).toBe('날씨 업데이트 중')
    expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe('polite')
  })

  it.each([
    ['network', '실시간 데이터'],
    ['cache', '저장된 데이터'],
    ['stale-cache', '저장된 날씨 표시 중'],
  ] as const)('%s 데이터 출처를 표시해야 한다', (dataSource, expectedLabel) => {
    const wrapper = mount(WeatherSyncStatus, {
      props: { dataSource, lastUpdatedAt: updatedAt },
    })

    expect(wrapper.get('[data-testid="weather-sync-status"]').text()).toContain(expectedLabel)
    expect(wrapper.get('[data-testid="weather-sync-status"]').text()).toContain('갱신')
  })

  it('캐시 없이 실패하면 실패 상태를 표시해야 한다', () => {
    const wrapper = mount(WeatherSyncStatus, {
      props: { errorMessage: 'provider detail must not be rendered elsewhere' },
    })

    expect(wrapper.get('[data-testid="weather-sync-status"]').text()).toBe('날씨 업데이트 실패')
  })
})
