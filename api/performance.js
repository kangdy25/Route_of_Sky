const ALLOWED_EVENTS = new Set([
  'viewer-ready',
  'tiles-stable',
  'initial-view-ready',
  'quality-applied',
  'weather-cache-hit',
  'weather-network',
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

export default function handler(request, response) {
  // 개발 Vercel 함수만 계측을 받습니다. Preview·Production은 원격 데이터를 남기지 않습니다.
  if (process.env.VERCEL_ENV !== 'development') {
    return response.status(404).end()
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return send(response, 405, { error: { message: 'POST 요청만 지원합니다.' } })
  }

  const body = parseBody(request.body)
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

  console.info(
    JSON.stringify({
      type: 'route-of-sky-performance',
      event: body.event,
      valueMs: Number(body.valueMs.toFixed(2)),
      timestampMs: Number(body.timestampMs.toFixed(2)),
    }),
  )

  return response.status(204).end()
}
