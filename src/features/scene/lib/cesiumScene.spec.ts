import { Cartesian3, Color, DynamicAtmosphereLightingType, SunLight } from 'cesium'
import { describe, expect, it, vi } from 'vitest'
import type { SceneWeatherState } from '../model/scene.types'
import { WORLD_LOCATIONS } from '../model/scene.constants'
import {
  CameraFlyToController,
  applyAtmosphereToScene,
  applySceneTime,
  configureCameraControls,
  configureViewerScene,
  setInitialLocationView,
  setInitialTimesSquareView,
} from './cesiumScene'

const { gsapTo } = vi.hoisted(() => ({
  gsapTo: vi.fn(),
}))

vi.mock('gsap', () => ({
  gsap: {
    to: gsapTo,
  },
}))

const baseState: SceneWeatherState = {
  time: 16.5,
  cloudCover: 35,
  precipitation: 0,
  aqi: 45,
  visibility: 15,
  temperature: 24.5,
  windSpeed: 5,
  windDirectionDegrees: 225,
  humidity: 62,
}

function createViewer() {
  const controller = {}
  const camera = {
    heading: 0.1,
    pitch: -0.4,
    roll: 0,
    positionWC: Cartesian3.fromDegrees(-73.98, 40.75, 1000),
    setView: vi.fn(),
  }

  return {
    camera,
    clock: {},
    scene: {
      backgroundColor: Color.BLACK.clone(),
      skyAtmosphere: {},
      sun: {},
      moon: {},
      atmosphere: {},
      fog: {},
      globe: {},
      screenSpaceCameraController: controller,
      requestRender: vi.fn(),
    },
  }
}

describe('Cesium scene 설정', () => {
  it('viewer scene과 카메라 컨트롤을 설정해야 한다', () => {
    const viewer = createViewer()

    configureViewerScene(viewer as never)

    expect(viewer.scene.skyAtmosphere.show).toBe(true)
    expect(viewer.scene.sun.show).toBe(true)
    expect(viewer.scene.moon.show).toBe(true)
    expect(viewer.scene.sunBloom).toBe(true)
    expect(viewer.scene.light).toBeInstanceOf(SunLight)
    expect(viewer.scene.atmosphere.dynamicLighting).toBe(DynamicAtmosphereLightingType.SUNLIGHT)
    expect(viewer.scene.fog.enabled).toBe(true)
    expect(viewer.scene.globe.show).toBe(false)
    expect(viewer.scene.screenSpaceCameraController.enableInputs).toBe(true)
  })

  it('skyAtmosphere, sun, moon이 없어도 scene 설정이 안전해야 한다', () => {
    const viewer = createViewer()
    viewer.scene.skyAtmosphere = undefined
    viewer.scene.sun = undefined
    viewer.scene.moon = undefined

    expect(() => configureViewerScene(viewer as never)).not.toThrow()
  })

  it('카메라 컨트롤 옵션을 설정해야 한다', () => {
    const viewer = createViewer()

    configureCameraControls(viewer as never)

    expect(viewer.scene.screenSpaceCameraController.minimumZoomDistance).toBe(80)
    expect(viewer.scene.screenSpaceCameraController.maximumZoomDistance).toBe(30000)
    expect(viewer.scene.screenSpaceCameraController.zoomEventTypes).toHaveLength(2)
    expect(viewer.scene.screenSpaceCameraController.lookEventTypes).toHaveLength(2)
  })

  it('초기 타임스퀘어 뷰를 카메라에 적용해야 한다', () => {
    const viewer = createViewer()

    setInitialTimesSquareView(viewer as never)

    expect(viewer.camera.setView).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: expect.any(Cartesian3),
        orientation: expect.objectContaining({ roll: 0 }),
      }),
    )
  })

  it('초기 뷰를 선택된 지역 좌표로 적용해야 한다', () => {
    const viewer = createViewer()
    const fromDegreesSpy = vi.spyOn(Cartesian3, 'fromDegrees')

    setInitialLocationView(viewer as never, WORLD_LOCATIONS[2])

    expect(fromDegreesSpy).toHaveBeenCalledWith(139.7454, 35.6586, 1650)
    expect(viewer.camera.setView).toHaveBeenCalled()

    fromDegreesSpy.mockRestore()
  })

  it('대기 상태를 scene fog, sky, light에 반영해야 한다', () => {
    const viewer = createViewer()
    viewer.scene.light = new SunLight()

    applyAtmosphereToScene(viewer as never, {
      ...baseState,
      visibility: 3,
      aqi: 160,
      precipitation: 4,
    })

    expect(viewer.scene.fog.enabled).toBe(true)
    expect(viewer.scene.fog.renderable).toBe(true)
    expect(viewer.scene.fog.density).toBeGreaterThan(0)
    expect(viewer.scene.skyAtmosphere.atmosphereLightIntensity).toBeGreaterThan(0)
    expect(viewer.scene.sun.glowFactor).toBeGreaterThan(0)
    expect(viewer.scene.requestRender).toHaveBeenCalled()
  })

  it('AQI, 강수, 눈보라만으로도 fog를 활성화해야 한다', () => {
    const aqiViewer = createViewer()
    const rainViewer = createViewer()
    const snowViewer = createViewer()

    applyAtmosphereToScene(aqiViewer as never, { ...baseState, visibility: 30, aqi: 100 })
    applyAtmosphereToScene(rainViewer as never, { ...baseState, visibility: 30, precipitation: 1 })
    applyAtmosphereToScene(snowViewer as never, {
      ...baseState,
      visibility: 30,
      precipitation: 8,
      temperature: -5,
      windSpeed: 18,
    })

    expect(aqiViewer.scene.fog.enabled).toBe(true)
    expect(rainViewer.scene.fog.enabled).toBe(true)
    expect(snowViewer.scene.fog.enabled).toBe(true)
  })

  it('낮에는 달을 숨겨야 한다', () => {
    const viewer = createViewer()

    applyAtmosphereToScene(viewer as never, { ...baseState, time: 12 })

    expect(viewer.scene.moon.show).toBe(false)
  })

  it('밤에는 달을 표시하고 skyAtmosphere가 없어도 대기 설정이 안전해야 한다', () => {
    const viewer = createViewer()
    viewer.scene.skyAtmosphere = undefined
    viewer.scene.sun = undefined
    viewer.scene.moon = {}

    applyAtmosphereToScene(viewer as never, { ...baseState, time: 23 })

    expect(viewer.scene.moon.show).toBe(true)
    expect(viewer.scene.requestRender).toHaveBeenCalled()
  })

  it('moon 객체가 없어도 대기 설정이 안전해야 한다', () => {
    const viewer = createViewer()
    viewer.scene.moon = undefined

    expect(() => applyAtmosphereToScene(viewer as never, baseState)).not.toThrow()
    expect(viewer.scene.requestRender).toHaveBeenCalled()
  })

  it('씬 시간을 Cesium clock에 적용해야 한다', () => {
    const viewer = createViewer()

    applySceneTime(viewer as never, { ...baseState, time: 16.5 })

    expect(viewer.clock.shouldAnimate).toBe(false)
    expect(viewer.clock.multiplier).toBe(1)
    expect(viewer.scene.requestRender).toHaveBeenCalled()
  })
})

describe('카메라 flyTo 컨트롤러', () => {
  it('viewer가 없으면 이동하지 않아야 한다', () => {
    const controller = new CameraFlyToController(() => null)

    controller.flyToLocation({ longitude: -73.98, latitude: 40.75 })

    expect(gsapTo).not.toHaveBeenCalled()
  })

  it('GSAP 보간으로 카메라 이동을 수행하고 dispose에서 tween을 정리해야 한다', () => {
    const viewer = createViewer()
    const kill = vi.fn()
    gsapTo.mockImplementation((progress, options) => {
      progress.value = 0.5
      options.onUpdate()
      options.onComplete()
      return { kill }
    })
    const controller = new CameraFlyToController(() => viewer as never)

    controller.flyToLocation({ longitude: -73.98, latitude: 40.76, duration: 1 })
    controller.dispose()

    expect(gsapTo).toHaveBeenCalled()
    expect(viewer.camera.setView).toHaveBeenCalled()
  })

  it('새 이동이 시작되면 기존 tween을 중단해야 한다', () => {
    const viewer = createViewer()
    const kill = vi.fn()
    gsapTo.mockReturnValue({ kill })
    const controller = new CameraFlyToController(() => viewer as never)

    controller.flyToLocation({ longitude: -73.98, latitude: 40.76 })
    controller.flyToLocation({ longitude: -73.99, latitude: 40.77 })

    expect(kill).toHaveBeenCalled()
  })

  it('보간 중 viewer가 사라지면 카메라 갱신을 건너뛰어야 한다', () => {
    const viewer = createViewer()
    let activeViewer: ReturnType<typeof createViewer> | null = viewer
    gsapTo.mockImplementation((_progress, options) => {
      activeViewer = null
      options.onUpdate()
      return { kill: vi.fn() }
    })
    const controller = new CameraFlyToController(() => activeViewer as never)

    controller.flyToLocation({ longitude: -73.98, latitude: 40.76 })

    expect(viewer.camera.setView).not.toHaveBeenCalled()
  })
})
