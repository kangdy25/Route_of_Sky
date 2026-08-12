import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from './performance.js'

function createResponse() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
    end() {
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
    },
  }
}

describe('/api/performance', () => {
  const originalEnvironment = process.env.VERCEL_ENV

  afterEach(() => {
    process.env.VERCEL_ENV = originalEnvironment
    vi.restoreAllMocks()
  })

  it('Preview와 Production에서는 계측 엔드포인트를 노출하지 않는다', () => {
    process.env.VERCEL_ENV = 'production'
    const response = createResponse()

    handler({ method: 'POST', body: {} }, response)

    expect(response.statusCode).toBe(404)
  })

  it('개발 환경에서 허용된 익명 이벤트만 구조화 로그로 출력한다', () => {
    process.env.VERCEL_ENV = 'development'
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const response = createResponse()

    handler(
      {
        method: 'POST',
        body: { event: 'viewer-ready', valueMs: 621.324, timestampMs: 621.324 },
      },
      response,
    )

    expect(response.statusCode).toBe(204)
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'route-of-sky-performance',
        event: 'viewer-ready',
        valueMs: 621.32,
        timestampMs: 621.32,
      }),
    )
  })

  it('식별자나 위치처럼 허용되지 않은 필드는 거절한다', () => {
    process.env.VERCEL_ENV = 'development'
    const response = createResponse()

    handler(
      {
        method: 'POST',
        body: { event: 'viewer-ready', valueMs: 1, timestampMs: 1, location: 'secret' },
      },
      response,
    )

    expect(response.statusCode).toBe(400)
  })
})
