const WEATHER_API_ENDPOINT = 'https://api.weatherapi.com/v1/forecast.json'
const UPSTREAM_TIMEOUT_MS = 8_000
const WEATHER_CDN_CACHE_CONTROL = 'max-age=300, stale-while-revalidate=60'

const ALLOWED_LOCATION_QUERIES = new Set([
  '37.5512,126.9882',
  '40.758,-73.9855',
  '35.6586,139.7454',
  '31.7767,35.2345',
  '51.5007,-0.1246',
  '48.8584,2.2945',
  '52.5163,13.3777',
  '-33.8568,151.2153',
  '-22.9519,-43.2105',
  '27.1751,78.0421',
])

function sendJson(response, status, payload) {
  return response.status(status).json(payload)
}

function getSingleQueryValue(value) {
  return typeof value === 'string' ? value : ''
}

function getWeatherApiKey() {
  // 기존 배포 환경을 끊지 않기 위해 이전 변수명을 임시 fallback으로 지원합니다.
  // 프런트엔드는 더 이상 이 값을 import.meta.env로 읽지 않아 번들에 포함하지 않습니다.
  return (
    globalThis.process?.env.WEATHER_API_KEY || globalThis.process?.env.VITE_WEATHER_API_KEY || ''
  )
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return sendJson(response, 405, { error: { message: 'GET 요청만 지원합니다.' } })
  }

  const locationQuery = getSingleQueryValue(request.query?.q)
  if (!ALLOWED_LOCATION_QUERIES.has(locationQuery)) {
    return sendJson(response, 400, { error: { message: '지원하지 않는 지역 좌표입니다.' } })
  }

  const apiKey = getWeatherApiKey()
  if (!apiKey) {
    return sendJson(response, 503, {
      error: { message: '날씨 API 서버 설정이 완료되지 않았습니다.' },
    })
  }

  const forceRefresh = getSingleQueryValue(request.query?.fresh) === '1'
  const upstreamUrl = new URL(WEATHER_API_ENDPOINT)
  upstreamUrl.searchParams.set('key', apiKey)
  upstreamUrl.searchParams.set('q', locationQuery)
  upstreamUrl.searchParams.set('days', '1')
  upstreamUrl.searchParams.set('aqi', 'yes')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    const payload = await upstreamResponse.json().catch(() => null)

    if (!upstreamResponse.ok || !payload) {
      return sendJson(response, 502, {
        error: { message: '외부 날씨 서비스가 요청을 처리하지 못했습니다.' },
      })
    }

    response.setHeader('CDN-Cache-Control', forceRefresh ? 'no-store' : WEATHER_CDN_CACHE_CONTROL)
    return sendJson(response, 200, payload)
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'

    return sendJson(response, timedOut ? 504 : 502, {
      error: {
        message: timedOut
          ? '날씨 서비스 응답 시간이 초과되었습니다.'
          : '날씨 서비스에 연결하지 못했습니다.',
      },
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
