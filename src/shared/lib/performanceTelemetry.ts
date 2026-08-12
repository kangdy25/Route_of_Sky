export const PERFORMANCE_EVENT_NAMES = [
  'viewer-ready',
  'tiles-stable',
  'quality-applied',
  'weather-cache-hit',
  'weather-network',
] as const

export type PerformanceEventName = (typeof PERFORMANCE_EVENT_NAMES)[number]

export interface PerformanceTelemetryEvent {
  event: PerformanceEventName
  valueMs: number
  timestampMs: number
}

function hasPerformanceQuery(search: string) {
  return new URLSearchParams(search).get('perf') === '1'
}

export function isDevelopmentPerformanceReportingEnabled(
  isDevelopment = import.meta.env.DEV,
  search = typeof window === 'undefined' ? '' : window.location.search,
) {
  return isDevelopment && hasPerformanceQuery(search)
}

export function reportDevelopmentPerformance(
  event: Omit<PerformanceTelemetryEvent, 'timestampMs'>,
) {
  if (!isDevelopmentPerformanceReportingEnabled() || typeof window === 'undefined') return

  const payload: PerformanceTelemetryEvent = {
    ...event,
    timestampMs: Number(performance.now().toFixed(2)),
  }

  void fetch('/api/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // 로컬 Vercel 개발 서버가 아닌 경우에도 앱 동작은 계측 실패와 무관하게 유지합니다.
  })
}
