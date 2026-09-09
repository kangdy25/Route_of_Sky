/** 서버 및 클라이언트가 공유하는 표준 성능 마일스톤 이벤트 이름 튜플 */
export const PERFORMANCE_EVENT_NAMES = [
  'viewer-ready', // Cesium 뷰어 인스턴스 생성 및 기본 씬 구성 완료
  'tiles-stable', // 1단계 Coarse 부모 타일셋 뷰포트 안착
  'initial-view-ready', // 모든 타일 청크 디코딩/업로드 큐가 소진되어 완전 정착
  'quality-applied', // 적응형 품질 제어기(Adaptive Quality) 프로필 적용
  'weather-cache-hit', // 날씨 데이터 SWR 캐시 적중
  'weather-network', // 날씨 데이터 외부 업스트림 네트워크 호출
] as const

export type PerformanceEventName = (typeof PERFORMANCE_EVENT_NAMES)[number]

export interface PerformanceTelemetryEvent {
  event: PerformanceEventName
  valueMs: number
  timestampMs: number
}

/** 현재 브라우저 URL 쿼리스트링에 `perf=1` 플래그가 포함되어 있는지 검사합니다. */
function hasPerformanceQuery(search: string) {
  return new URLSearchParams(search).get('perf') === '1'
}

/** 개발 환경 성능 텔레메트리 리포팅이 활성화되어 있는지 검증하는 가드 함수 */
export function isDevelopmentPerformanceReportingEnabled(
  isDevelopment = import.meta.env.DEV,
  search = typeof window === 'undefined' ? '' : window.location.search,
) {
  return isDevelopment && hasPerformanceQuery(search)
}

/** 발생한 성능 측정 마일스톤을 비동기로 서버에 전송합니다. */
export function reportDevelopmentPerformance(event: Omit<PerformanceTelemetryEvent, 'timestampMs'>) {
  // 계측 비활성화 상태이거나 SSR 환경인 경우 즉시 종료 (Early Return)
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
