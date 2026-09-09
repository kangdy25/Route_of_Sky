import { describe, expect, it } from 'vitest'
import { formatInteger, formatSingleDecimal } from './formatMetricValue'

describe('weather metric value formatter', () => {
  it('습도용 정수 표기는 가장 가까운 정수로 반올림한다', () => {
    expect(formatInteger(61.54)).toBe('62')
  })

  it('한 자리 소수 표기는 의미 없는 .0을 생략한다', () => {
    expect(formatSingleDecimal(24)).toBe('24')
    expect(formatSingleDecimal(5.56)).toBe('5.6')
  })
})
