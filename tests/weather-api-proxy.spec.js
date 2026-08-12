import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/weather.js'

function createRequest(overrides = {}) {
  return {
    method: 'GET',
    query: { q: '40.758,-73.9855' },
    ...overrides,
  }
}

function createResponse() {
  const headers = new Map()
  const response = {
    body: undefined,
    headers,
    statusCode: 200,
    setHeader: vi.fn((name, value) => {
      headers.set(name, value)
      return response
    }),
    status: vi.fn((statusCode) => {
      response.statusCode = statusCode
      return response
    }),
    json: vi.fn((body) => {
      response.body = body
      return response
    }),
  }

  return response
}

describe('Vercel 날씨 API 프록시', () => {
  beforeEach(() => {
    vi.stubEnv('WEATHER_API_KEY', 'server-only-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('허용된 좌표를 WeatherAPI로 전달하고 CDN에서 5분 캐시해야 한다', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ location: {}, current: { temp_c: 20 } }),
    })
    vi.stubGlobal('fetch', fetcher)
    const response = createResponse()

    await handler(createRequest(), response)

    expect(response.statusCode).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('CDN-Cache-Control')).toBe('max-age=300, stale-while-revalidate=60')

    const upstreamUrl = fetcher.mock.calls[0][0]
    expect(upstreamUrl).toBeInstanceOf(URL)
    expect(upstreamUrl.origin).toBe('https://api.weatherapi.com')
    expect(upstreamUrl.searchParams.get('key')).toBe('server-only-key')
    expect(upstreamUrl.searchParams.get('q')).toBe('40.758,-73.9855')
    expect(upstreamUrl.searchParams.get('days')).toBe('1')
    expect(upstreamUrl.searchParams.get('aqi')).toBe('yes')
  })

  it('강제 갱신 요청은 Vercel CDN 캐시도 우회해야 한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ current: {} }) }),
    )
    const response = createResponse()

    await handler(createRequest({ query: { q: '40.758,-73.9855', fresh: '1' } }), response)

    expect(response.statusCode).toBe(200)
    expect(response.headers.get('CDN-Cache-Control')).toBe('no-store')
  })

  it('앱에서 사용하지 않는 좌표를 외부 API로 전달하지 않아야 한다', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const response = createResponse()

    await handler(createRequest({ query: { q: '0,0' } }), response)

    expect(response.statusCode).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('GET 이외의 메서드를 거부해야 한다', async () => {
    const response = createResponse()

    await handler(createRequest({ method: 'POST' }), response)

    expect(response.statusCode).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET')
  })

  it('서버 API 키가 없으면 외부 요청 없이 503을 반환해야 한다', async () => {
    vi.stubEnv('WEATHER_API_KEY', '')
    vi.stubEnv('VITE_WEATHER_API_KEY', '')
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const response = createResponse()

    await handler(createRequest(), response)

    expect(response.statusCode).toBe(503)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('기존 Vercel 변수명을 서버 전용 fallback으로 사용할 수 있어야 한다', async () => {
    vi.stubEnv('WEATHER_API_KEY', '')
    vi.stubEnv('VITE_WEATHER_API_KEY', 'existing-deployment-key')
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ location: {}, current: {} }),
    })
    vi.stubGlobal('fetch', fetcher)
    const response = createResponse()

    await handler(createRequest(), response)

    expect(response.statusCode).toBe(200)
    expect(fetcher.mock.calls[0][0].searchParams.get('key')).toBe('existing-deployment-key')
  })

  it('외부 API 오류 세부 내용을 노출하지 않고 502로 정규화해야 한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'upstream secret detail' } }),
      }),
    )
    const response = createResponse()

    await handler(createRequest(), response)

    expect(response.statusCode).toBe(502)
    expect(JSON.stringify(response.body)).not.toContain('upstream secret detail')
  })

  it('네트워크 오류를 502로 반환해야 한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const response = createResponse()

    await handler(createRequest(), response)

    expect(response.statusCode).toBe(502)
  })

  it('외부 API 시간 초과를 504로 반환해야 한다', async () => {
    const timeoutError = new Error('aborted')
    timeoutError.name = 'AbortError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError))
    const response = createResponse()

    await handler(createRequest(), response)

    expect(response.statusCode).toBe(504)
  })
})
