import { afterEach, describe, expect, it, vi } from 'vitest'

describe('Cesium env config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('토큰 env가 없으면 빈 문자열과 비활성 상태를 반환해야 한다', async () => {
    vi.stubEnv('VITE_CESIUM_ION_ACCESS_TOKEN', '')
    vi.resetModules()

    const env = await import('./env')

    expect(env.cesiumIonAccessToken).toBe('')
    expect(env.hasCesiumIonAccessToken).toBe(false)
  })
})
