import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import SceneCanvas from './SceneCanvas.vue'

const mocks = vi.hoisted(() => {
  const makeEvent = () => {
    const listeners: Array<(...args: unknown[]) => void> = []
    return {
      listeners,
      addEventListener: vi.fn((listener: (...args: unknown[]) => void) => {
        listeners.push(listener)
        return vi.fn()
      }),
    }
  }

  const makeTileset = () => ({
    maximumScreenSpaceError: 16,
    tileLoad: makeEvent(),
    loadProgress: makeEvent(),
    initialTilesLoaded: makeEvent(),
    allTilesLoaded: makeEvent(),
  })

  const makeViewer = () => ({
    clock: { currentTime: 'now' },
    camera: {
      positionWC: { x: 1, y: 2, z: 3 },
      directionWC: { x: 0, y: 0, z: 1 },
    },
    scene: {
      primitives: {
        add: vi.fn(),
      },
      postRender: makeEvent(),
      requestRender: vi.fn(),
    },
    forceResize: vi.fn(),
    render: vi.fn(),
    isDestroyed: vi.fn(() => false),
    destroy: vi.fn(),
  })

  const state = {
    viewer: makeViewer(),
    tileset: makeTileset(),
    viewerCtor: vi.fn(),
    fromIonAssetId: vi.fn(),
    configureViewerScene: vi.fn(),
    setInitialTimesSquareView: vi.fn(),
    applySceneTime: vi.fn(),
    applyAtmosphereToScene: vi.fn(),
    cameraInstances: [] as Array<{
      flyToLocation: ReturnType<typeof vi.fn>
      dispose: ReturnType<typeof vi.fn>
    }>,
    cloudInstances: [] as Array<{
      update: ReturnType<typeof vi.fn>
      dispose: ReturnType<typeof vi.fn>
    }>,
    postProcessInstances: [] as Array<{
      update: ReturnType<typeof vi.fn>
      dispose: ReturnType<typeof vi.fn>
    }>,
    screenWeatherInstances: [] as Array<{
      update: ReturnType<typeof vi.fn>
      stop: ReturnType<typeof vi.fn>
    }>,
    makeViewer,
    makeTileset,
  }

  return state
})

vi.mock('cesium', () => {
  class Cartesian2 {
    constructor(
      public x = 0,
      public y = 0,
    ) {}
  }

  class Cartesian3 {
    constructor(
      public x = 0,
      public y = 0,
      public z = 0,
    ) {}

    static subtract = vi.fn(() => ({}))
    static dot = vi.fn(() => 1)
  }

  return {
    Cartesian2,
    Cartesian3,
    Ion: { defaultAccessToken: '' },
    Viewer: vi.fn(function Viewer(...args: unknown[]) {
      mocks.viewerCtor(...args)
      return mocks.viewer
    }),
    Cesium3DTileset: {
      fromIonAssetId: mocks.fromIonAssetId,
    },
    Math: {
      lerp: (start: number, end: number, amount: number) => start + (end - start) * amount,
    },
    SceneTransforms: {
      worldToWindowCoordinates: vi.fn(() => ({ x: 20, y: 40 })),
    },
  }
})

vi.mock('@/shared/config/env', () => ({
  cesiumIonAccessToken: 'test-token',
  hasCesiumIonAccessToken: true,
}))

vi.mock('@/features/scene/lib/cesiumScene', () => ({
  CameraFlyToController: class {
    flyToLocation = vi.fn()
    dispose = vi.fn()

    constructor(getViewer: () => unknown) {
      getViewer()
      mocks.cameraInstances.push(this)
    }
  },
  applyAtmosphereToScene: mocks.applyAtmosphereToScene,
  applySceneTime: mocks.applySceneTime,
  configureViewerScene: mocks.configureViewerScene,
  setInitialTimesSquareView: mocks.setInitialTimesSquareView,
}))

vi.mock('@/features/scene/lib/clouds', () => ({
  CloudController: class {
    update = vi.fn()
    dispose = vi.fn()

    constructor(getViewer: () => unknown, getState: () => unknown, getLocation: () => unknown) {
      getViewer()
      getState()
      getLocation()
      mocks.cloudInstances.push(this)
    }
  },
}))

vi.mock('@/features/scene/lib/weatherPostProcess', () => ({
  WeatherPostProcessController: class {
    update = vi.fn()
    dispose = vi.fn()

    constructor(getViewer: () => unknown, getState: () => unknown) {
      getViewer()
      getState()
      mocks.postProcessInstances.push(this)
    }
  },
}))

vi.mock('@/features/scene/lib/screenWeather', () => ({
  ScreenWeatherRenderer: class {
    update = vi.fn()
    stop = vi.fn()

    constructor(_canvasRef: unknown, getState: () => unknown) {
      getState()
      mocks.screenWeatherInstances.push(this)
    }
  },
}))

vi.mock('@/features/scene/lib/overlayStyles', () => ({
  getAtmosphereOverlayStyle: vi.fn(() => ({ opacity: 0.1 })),
  getMistOverlayStyle: vi.fn(() => ({ opacity: 0.2 })),
  getSkyTimeStyle: vi.fn(() => ({ opacity: 0.3 })),
  getTwilightCloudGlowStyle: vi.fn(() => ({ opacity: 0.4 })),
  getWhiteoutOverlayStyle: vi.fn(() => ({ opacity: 0.5 })),
}))

vi.mock('@/features/scene/lib/sky', () => ({
  getSkyPhase: vi.fn(() => ({ daylight: 1, dawn: 0, dusk: 0, horizonGlow: 0.5 })),
  getSunPositionForTime: vi.fn(() => ({ x: 4, y: 5, z: 6 })),
}))

async function flushAsyncWork() {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('SceneCanvas', () => {
  beforeEach(() => {
    mocks.viewer = mocks.makeViewer()
    mocks.tileset = mocks.makeTileset()
    mocks.viewerCtor.mockClear()
    mocks.fromIonAssetId.mockReset()
    mocks.fromIonAssetId.mockResolvedValue(mocks.tileset)
    mocks.configureViewerScene.mockClear()
    mocks.setInitialTimesSquareView.mockClear()
    mocks.applySceneTime.mockClear()
    mocks.applyAtmosphereToScene.mockClear()
    mocks.cameraInstances.length = 0
    mocks.cloudInstances.length = 0
    mocks.postProcessInstances.length = 0
    mocks.screenWeatherInstances.length = 0
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 42),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  it('Viewer를 초기화하고 Google 3D Tiles를 로드해야 한다', async () => {
    const wrapper = mount(SceneCanvas)

    await flushAsyncWork()

    expect(mocks.viewerCtor).toHaveBeenCalled()
    expect(mocks.configureViewerScene).toHaveBeenCalledWith(mocks.viewer)
    expect(mocks.setInitialTimesSquareView).toHaveBeenCalledTimes(2)
    expect(mocks.fromIonAssetId).toHaveBeenCalledWith(
      2275207,
      expect.objectContaining({
        maximumScreenSpaceError: 16,
        loadSiblings: true,
      }),
    )
    expect(mocks.viewer.scene.primitives.add).toHaveBeenCalledWith(mocks.tileset)
    expect(mocks.viewer.forceResize).toHaveBeenCalled()
    expect(mocks.viewer.render).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Loading Google Photorealistic 3D Tiles')
  })

  it('context menu 기본 동작을 막아 Cesium 캔버스 조작을 유지해야 한다', async () => {
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()
    const event = new Event('contextmenu', { bubbles: true, cancelable: true })

    wrapper.find('#cesiumContainer').element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('첫 타일이 로드되면 로딩 상태를 해제하고 품질 목표를 되돌려야 한다', async () => {
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    mocks.tileset.tileLoad.listeners[0]()
    await nextTick()

    expect(mocks.tileset.maximumScreenSpaceError).toBe(2)
    expect(wrapper.text()).not.toContain('Loading Google Photorealistic 3D Tiles')
  })

  it('타일셋 진행 이벤트와 완료 이벤트는 추가 렌더를 요청하고 정리해야 한다', async () => {
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()
    mocks.viewer.scene.requestRender.mockClear()

    mocks.tileset.loadProgress.listeners[0]()
    mocks.tileset.initialTilesLoaded.listeners[0]()
    mocks.tileset.allTilesLoaded.listeners[0]()

    expect(mocks.viewer.scene.requestRender).toHaveBeenCalled()
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42)
    wrapper.unmount()
  })

  it('워밍업 중 타임아웃 전에는 다음 프레임을 예약해야 한다', async () => {
    const frameCallbacks: Array<FrameRequestCallback> = []
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frameCallbacks.push(callback)
        return frameCallbacks.length
      }),
    )
    const nowSpy = vi.spyOn(window.performance, 'now').mockReturnValue(0)
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    nowSpy.mockReturnValue(1000)
    frameCallbacks[0]?.(1000)
    await flushAsyncWork()

    expect(frameCallbacks).toHaveLength(2)
    expect(wrapper.text()).toContain('Loading Google Photorealistic 3D Tiles')
    nowSpy.mockRestore()
  })

  it('워밍업이 정리된 뒤 남은 frame callback은 아무 작업도 하지 않아야 한다', async () => {
    let frameCallback: FrameRequestCallback | null = null
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback
        return 42
      }),
    )
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    mocks.tileset.initialTilesLoaded.listeners[0]()
    mocks.viewer.render.mockClear()
    frameCallback?.(1000)

    expect(mocks.viewer.render).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('워밍업 시간이 오래 지나면 타임아웃으로 초기 로딩을 정리해야 한다', async () => {
    let frameCallback: FrameRequestCallback | null = null
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback
        return 77
      }),
    )
    const nowSpy = vi.spyOn(window.performance, 'now').mockReturnValue(0)
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    nowSpy.mockReturnValue(16001)
    frameCallback?.(16001)
    await flushAsyncWork()

    expect(wrapper.text()).not.toContain('Loading Google Photorealistic 3D Tiles')
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(77)
    nowSpy.mockRestore()
  })

  it('언마운트 이후 타일 이벤트가 들어와도 안전해야 한다', async () => {
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    wrapper.unmount()

    expect(() => mocks.tileset.tileLoad.listeners[0]()).not.toThrow()
  })

  it('타일셋 로드 완료 전에 언마운트되면 primitive를 추가하지 않아야 한다', async () => {
    let resolveTileset!: (tileset: typeof mocks.tileset) => void
    mocks.fromIonAssetId.mockReturnValue(
      new Promise((resolve) => {
        resolveTileset = resolve
      }),
    )
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    wrapper.unmount()
    resolveTileset(mocks.tileset)
    await flushAsyncWork()

    expect(mocks.viewer.scene.primitives.add).not.toHaveBeenCalled()
  })

  it('태양 위치가 화면 좌표로 변환되지 않으면 glow를 숨겨야 한다', async () => {
    const { SceneTransforms } = await import('cesium')
    vi.mocked(SceneTransforms.worldToWindowCoordinates).mockReturnValueOnce(undefined)
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    mocks.viewer.scene.postRender.listeners[0]()
    await nextTick()

    const sunGlow = wrapper.findAll('div').find((element) => element.classes().includes('h-24'))
    expect(sunGlow?.attributes('style')).toContain('opacity: 0')
  })

  it('viewer가 이미 destroy된 상태면 sun glow를 숨겨야 한다', async () => {
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    mocks.viewer.isDestroyed.mockReturnValue(true)
    mocks.viewer.scene.postRender.listeners[0]()
    await nextTick()

    const sunGlow = wrapper.findAll('div').find((element) => element.classes().includes('h-24'))
    expect(sunGlow?.attributes('style')).toContain('opacity: 0')
  })

  it('태양이 카메라 뒤에 있으면 glow를 숨겨야 한다', async () => {
    const { Cartesian3 } = await import('cesium')
    vi.mocked(Cartesian3.dot).mockReturnValueOnce(-1)
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    mocks.viewer.scene.postRender.listeners[0]()
    await nextTick()

    const sunGlow = wrapper.findAll('div').find((element) => element.classes().includes('h-24'))
    expect(sunGlow?.attributes('style')).toContain('opacity: 0')
  })

  it('viewer가 destroy된 상태에서 워밍업 frame이 들어와도 렌더링하지 않아야 한다', async () => {
    let frameCallback: FrameRequestCallback | null = null
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback
        return 42
      }),
    )
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    mocks.viewer.isDestroyed.mockReturnValue(true)
    mocks.viewer.render.mockClear()
    frameCallback?.(1000)

    expect(mocks.viewer.render).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('animation frame id가 없으면 취소 요청 없이 워밍업을 정리해야 한다', async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 0),
    )
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()
    vi.mocked(window.cancelAnimationFrame).mockClear()

    mocks.tileset.initialTilesLoaded.listeners[0]()

    expect(window.cancelAnimationFrame).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('타일 로드 실패 메시지를 렌더링해야 한다', async () => {
    const error = new Error('ion failed')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.fromIonAssetId.mockRejectedValue(error)

    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    expect(errorSpy).toHaveBeenCalledWith(error)
    expect(wrapper.text()).toContain('Unable to load Google 3D Tiles asset')
    errorSpy.mockRestore()
  })

  it('props가 바뀌면 scene 상태를 다시 적용해야 한다', async () => {
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    mocks.applySceneTime.mockClear()
    await wrapper.setProps({ precipitation: 4, cloudCover: 90 })

    expect(mocks.applySceneTime).toHaveBeenCalled()
    expect(mocks.applyAtmosphereToScene).toHaveBeenCalled()
    expect(mocks.cloudInstances[0].update).toHaveBeenCalled()
    expect(mocks.postProcessInstances[0].update).toHaveBeenCalled()
  })

  it('노출된 flyToLocation은 카메라 컨트롤러로 전달되어야 한다', async () => {
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()
    const waypoint = { longitude: 127.2, latitude: 37.5, height: 1200 }

    wrapper.vm.flyToLocation(waypoint)

    expect(mocks.cameraInstances[0].flyToLocation).toHaveBeenCalledWith(waypoint)
  })

  it('언마운트 시 렌더 루프와 scene 리소스를 정리해야 한다', async () => {
    const wrapper = mount(SceneCanvas)
    await flushAsyncWork()

    wrapper.unmount()

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42)
    expect(mocks.cameraInstances[0].dispose).toHaveBeenCalled()
    expect(mocks.cloudInstances[0].dispose).toHaveBeenCalled()
    expect(mocks.postProcessInstances[0].dispose).toHaveBeenCalled()
    expect(mocks.screenWeatherInstances[0].stop).toHaveBeenCalled()
    expect(mocks.viewer.destroy).toHaveBeenCalled()
  })
})
