import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import SceneCanvas from './SceneCanvas.vue'

const mocks = vi.hoisted(() => ({
  fromIonAssetId: vi.fn(),
  viewer: {
    clock: { currentTime: 'now' },
    camera: {
      positionWC: {},
      directionWC: {},
    },
    scene: {
      primitives: { add: vi.fn() },
      postRender: { addEventListener: vi.fn(() => vi.fn()) },
      requestRender: vi.fn(),
    },
    forceResize: vi.fn(),
    render: vi.fn(),
    isDestroyed: vi.fn(() => false),
    destroy: vi.fn(),
  },
}))

vi.mock('@/shared/config/env', () => ({
  cesiumIonAccessToken: '',
  hasCesiumIonAccessToken: false,
}))

vi.mock('cesium', () => ({
  Cartesian2: class {},
  Cartesian3: class {
    static subtract = vi.fn(() => ({}))
    static dot = vi.fn(() => 1)
  },
  Cesium3DTileset: {
    fromIonAssetId: mocks.fromIonAssetId,
  },
  Ion: { defaultAccessToken: '' },
  Math: {
    lerp: vi.fn(() => 1),
  },
  SceneTransforms: {
    worldToWindowCoordinates: vi.fn(() => ({ x: 0, y: 0 })),
  },
  Viewer: vi.fn(function Viewer() {
    return mocks.viewer
  }),
}))

vi.mock('@/features/scene/lib/cesiumScene', () => ({
  CameraFlyToController: class {
    flyToLocation = vi.fn()
    dispose = vi.fn()
  },
  applyAtmosphereToScene: vi.fn(),
  applySceneTime: vi.fn(),
  configureViewerScene: vi.fn(),
  setInitialJamsilView: vi.fn(),
}))

vi.mock('@/features/scene/lib/clouds', () => ({
  CloudController: class {
    update = vi.fn()
    dispose = vi.fn()
  },
}))

vi.mock('@/features/scene/lib/weatherPostProcess', () => ({
  WeatherPostProcessController: class {
    update = vi.fn()
    dispose = vi.fn()
  },
}))

vi.mock('@/features/scene/lib/screenWeather', () => ({
  ScreenWeatherRenderer: class {
    update = vi.fn()
    stop = vi.fn()
  },
}))

vi.mock('@/features/scene/lib/overlayStyles', () => ({
  getAtmosphereOverlayStyle: vi.fn(() => ({})),
  getMistOverlayStyle: vi.fn(() => ({})),
  getSkyTimeStyle: vi.fn(() => ({})),
  getTwilightCloudGlowStyle: vi.fn(() => ({})),
  getWhiteoutOverlayStyle: vi.fn(() => ({})),
}))

vi.mock('@/features/scene/lib/sky', () => ({
  getSkyPhase: vi.fn(() => ({ daylight: 1, horizonGlow: 0 })),
  getSunPositionForTime: vi.fn(() => ({})),
}))

describe('SceneCanvas without Cesium token', () => {
  it('토큰 안내 메시지를 표시하고 Google 3D Tiles 요청을 건너뛰어야 한다', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const wrapper = mount(SceneCanvas)
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Cesium ion token required for Google 3D Tiles')
    expect(mocks.fromIonAssetId).not.toHaveBeenCalled()
  })
})
