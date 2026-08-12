import { describe, expect, it } from 'vitest'
import { isDevelopmentPerformanceReportingEnabled } from './performanceTelemetry'

describe('development performance telemetry guard', () => {
  it('개발 모드와 perf=1 쿼리가 동시에 있을 때만 활성화한다', () => {
    expect(isDevelopmentPerformanceReportingEnabled(true, '?perf=1')).toBe(true)
    expect(isDevelopmentPerformanceReportingEnabled(true, '?perf=0')).toBe(false)
    expect(isDevelopmentPerformanceReportingEnabled(false, '?perf=1')).toBe(false)
  })
})
