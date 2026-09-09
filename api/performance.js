/** 수집을 허용하는 클라이언트 성능 마일스톤 이벤트 화이트리스트 */
const ALLOWED_EVENTS = new Set([
  'viewer-ready', // Cesium 뷰어 인스턴스 생성 및 기본 씬 구성 완료
  'tiles-stable', // 초기 3D 저해상도 부모 타일셋 뷰포트 안착
  'initial-view-ready', // 모든 타일 요청 큐가 비고 목표 LOD 완전 정착
  'quality-applied', // 적응형 품질 제어기에 의한 해상도/품질 프로필 적용
  'weather-cache-hit', // 날씨 데이터 SWR 캐시 히트
  'weather-network', // 날씨 데이터 업스트림 네트워크 패칭
])

function send(response, status, body) {
  return response.status(status).json(body)
}

function parseBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return null
    }
  }

  return body && typeof body === 'object' ? body : null
}

function isFiniteNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** 성능 텔레메트리 수집 서버리스 핸들러. */
export default function handler(request, response) {
  // 개발(Development) 환경에서만 작동하며, 배포 환경에서는 엔드포인트 존재 자체를 은닉 (404)
  if (process.env.VERCEL_ENV !== 'development') {
    return response.status(404).end()
  }

  // 데이터 수집은 오직 POST 메서드만 허용
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return send(response, 405, { error: { message: 'POST 요청만 지원합니다.' } })
  }

  const body = parseBody(request.body)

  // 허용되지 않은 추가 프로퍼티 주입 방어 (Strict Key Schema)
  if (!body || Object.keys(body).some((key) => !['event', 'valueMs', 'timestampMs'].includes(key))) {
    return send(response, 400, { error: { message: '허용되지 않은 성능 이벤트 형식입니다.' } })
  }

  if (
    !ALLOWED_EVENTS.has(body.event) ||
    !isFiniteNonNegativeNumber(body.valueMs) ||
    !isFiniteNonNegativeNumber(body.timestampMs)
  ) {
    return send(response, 400, { error: { message: '유효하지 않은 성능 이벤트입니다.' } })
  }

  // APM/로그 수집기가 파싱하기 쉬운 표준 JSON 형태로 표준 출력(stdout) 기록
  console.info(
    JSON.stringify({
      type: 'route-of-sky-performance',
      event: body.event,
      valueMs: Number(body.valueMs.toFixed(2)),
      timestampMs: Number(body.timestampMs.toFixed(2)),
    }),
  )

  // 성공 시 네트워크 오버헤드 최소화를 위해 204 No Content 반환
  return response.status(204).end()
}
