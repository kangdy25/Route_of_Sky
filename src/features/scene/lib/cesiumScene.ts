import { gsap } from 'gsap'
import {
  CameraEventType,
  Cartesian3,
  ClockRange,
  Color,
  DynamicAtmosphereLightingType,
  JulianDate,
  KeyboardEventModifier,
  Math as CesiumMath,
  SunLight,
  Viewer,
} from 'cesium'

import { WORLD_LOCATIONS } from '../model/scene.constants'
import type { CameraWaypoint, SceneLocation, SceneWeatherState, SkyPhase } from '../model/scene.types'
import { clampToRange, clampToUnitInterval, lerpRadians } from './math'
import { getSceneDateFromLocalTime, getSkyPhase } from './sky'
import { getSnowstormIntensity, getWeatherTint } from './weather'

// --- GC 및 DOM 강제 리플로우 방지를 위한 캐싱/Scratch 버퍼 ---
const COLOR_BACKGROUND_NIGHT = Color.fromCssColorString('#020617')
const COLOR_BACKGROUND_DAY = Color.fromCssColorString('#0f2747')

const atmosphereSkyPhaseScratch: SkyPhase = {
  dawn: 0,
  noon: 0,
  sunset: 0,
  night: 0,
  daylight: 0,
  dusk: 0,
  horizonGlow: 0,
}
const atmosphereColorScratch = new Color()

const currentTimeScratch = new JulianDate()
const startTimeScratch = new JulianDate()
const stopTimeScratch = new JulianDate()

const flightCurrentPositionScratch = new Cartesian3()

// Cesium Viewer 자체의 상태를 다루는 모듈입니다.
export function configureViewerScene(viewer: Viewer) {
  viewer.scene.backgroundColor = COLOR_BACKGROUND_NIGHT
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.show = true
    viewer.scene.skyAtmosphere.perFragmentAtmosphere = true
  }
  if (viewer.scene.sun) {
    viewer.scene.sun.show = true
    viewer.scene.sun.glowFactor = 1.8
  }
  if (viewer.scene.moon) {
    viewer.scene.moon.show = true
  }
  viewer.scene.sunBloom = true
  viewer.scene.light = new SunLight({ intensity: 2.0 })
  viewer.scene.atmosphere.dynamicLighting = DynamicAtmosphereLightingType.SUNLIGHT
  viewer.scene.fog.enabled = true
  viewer.scene.globe.show = false
  configureCameraControls(viewer)
}

export function configureCameraControls(viewer: Viewer) {
  const controller = viewer.scene.screenSpaceCameraController
  controller.enableInputs = true
  controller.enableRotate = true
  controller.enableTranslate = true
  controller.enableZoom = true
  controller.enableTilt = true
  controller.enableLook = true
  controller.enableCollisionDetection = false
  controller.minimumZoomDistance = 80
  controller.maximumZoomDistance = 30000
  controller.maximumTiltAngle = undefined
  controller.inertiaSpin = 0.45
  controller.inertiaTranslate = 0.45
  controller.inertiaZoom = 0.35
  controller.zoomEventTypes = [CameraEventType.WHEEL, CameraEventType.PINCH]
  controller.lookEventTypes = [
    CameraEventType.RIGHT_DRAG,
    {
      eventType: CameraEventType.LEFT_DRAG,
      modifier: KeyboardEventModifier.SHIFT,
    },
  ]
}

export function setInitialLocationView(viewer: Viewer, location: SceneLocation = WORLD_LOCATIONS[1]) {
  const view = location.cameraView
  const targetLng = view?.longitude ?? location.lng
  const targetLat = view?.latitude ?? location.lat
  const targetHeight = view?.height ?? 1200
  const heading = view?.headingDegrees ?? 0
  const pitch = view?.pitchDegrees ?? -35
  const roll = view?.rollDegrees ?? 0

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(targetLng, targetLat, targetHeight),
    orientation: {
      heading: CesiumMath.toRadians(heading),
      pitch: CesiumMath.toRadians(pitch),
      roll: CesiumMath.toRadians(roll),
    },
  })
}

export function setInitialTimesSquareView(viewer: Viewer) {
  const ny = WORLD_LOCATIONS.find((loc) => loc.id === 'us-new-york') ?? WORLD_LOCATIONS[1]
  setInitialLocationView(viewer, ny)
}

export function applyAtmosphereToScene(viewer: Viewer, state: SceneWeatherState) {
  const sky = getSkyPhase(state.time, atmosphereSkyPhaseScratch)
  const visibilityKm = clampToRange(state.visibility, 0.1, 30)
  const visibilityFactor = clampToUnitInterval((20 - visibilityKm) / 20)
  const aqiHazeFactor = clampToUnitInterval((state.aqi - 45) / 180)
  const precipitationHazeFactor = clampToUnitInterval(state.precipitation / 16)
  const snowstormHazeFactor = getSnowstormIntensity(state)
  const nightFactor = sky.night

  // Koschmieder 법칙 소산 계수 기반 안개 밀도 계산
  const extinctionCoefficient = 3.912 / (visibilityKm * 1000)
  const fogDensity = clampToRange(
    extinctionCoefficient * (1 + aqiHazeFactor * 2.2 + precipitationHazeFactor * 0.9 + snowstormHazeFactor * 1.8),
    0.000045,
    0.0034,
  )
  const fogTint = getWeatherTint(state)

  viewer.scene.fog.enabled = visibilityKm < 22 || state.aqi > 65 || snowstormHazeFactor > 0 || state.precipitation > 0.2
  viewer.scene.fog.renderable = true
  viewer.scene.fog.density = fogDensity
  viewer.scene.fog.minimumBrightness = CesiumMath.lerp(0.018, 0.16, sky.noon)

  // CSS 문자열 파싱 없이 정적 Color 인스턴스 간 보간 수행 (Reflow 완전 제거)
  const baseBgColor = sky.noon > 0.1 ? COLOR_BACKGROUND_DAY : COLOR_BACKGROUND_NIGHT
  const blendRatio = CesiumMath.lerp(0.08, 0.28, Math.max(visibilityFactor, aqiHazeFactor, snowstormHazeFactor * 0.56))
  viewer.scene.backgroundColor = Color.lerp(baseBgColor, fogTint, blendRatio, atmosphereColorScratch)

  viewer.scene.fog.screenSpaceErrorFactor = CesiumMath.lerp(1.4, 3.4, Math.max(visibilityFactor, snowstormHazeFactor))
  viewer.scene.fog.visualDensityScalar = CesiumMath.lerp(
    0.16,
    0.72,
    Math.max(visibilityFactor, aqiHazeFactor, snowstormHazeFactor),
  )

  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.atmosphereLightIntensity = CesiumMath.lerp(3.0, 12.0, sky.noon)
    viewer.scene.skyAtmosphere.hueShift = CesiumMath.lerp(-0.08, 0.02, sky.noon) + aqiHazeFactor * 0.06
    viewer.scene.skyAtmosphere.saturationShift =
      CesiumMath.lerp(-0.18, 0.08, sky.noon) - visibilityFactor * 0.14 + aqiHazeFactor * 0.08
    viewer.scene.skyAtmosphere.brightnessShift =
      CesiumMath.lerp(-0.55, 0.12, sky.noon) - precipitationHazeFactor * 0.1 - snowstormHazeFactor * 0.1
  }

  if (viewer.scene.light instanceof SunLight) {
    viewer.scene.light.intensity = CesiumMath.lerp(0.05, 2.0, sky.noon)
  }
  if (viewer.scene.sun) {
    viewer.scene.sun.glowFactor = CesiumMath.lerp(1.1, 3.1, sky.horizonGlow)
  }
  if (viewer.scene.moon) {
    viewer.scene.moon.show = nightFactor > 0.25
  }

  viewer.scene.requestRender()
}

export function applySceneTime(viewer: Viewer, state: SceneWeatherState, location: SceneLocation = WORLD_LOCATIONS[1]) {
  // JulianDate 인스턴스 재사용으로 가비지 컬렉터 부하 차단
  JulianDate.fromDate(getSceneDateFromLocalTime(state.time, location), currentTimeScratch)
  JulianDate.fromDate(getSceneDateFromLocalTime(0, location), startTimeScratch)
  JulianDate.fromDate(getSceneDateFromLocalTime(24, location), stopTimeScratch)

  viewer.clock.startTime = startTimeScratch
  viewer.clock.stopTime = stopTimeScratch
  viewer.clock.currentTime = currentTimeScratch
  viewer.clock.clockRange = ClockRange.LOOP_STOP
  viewer.clock.shouldAnimate = false
  viewer.clock.multiplier = 1
  viewer.scene.requestRender()
}

export interface CameraFlightCallbacks {
  onStart?: () => void
  onFinish?: () => void
}

export class CameraFlyToController {
  private activeTween: gsap.core.Tween | null = null
  private activeFlightId = 0
  private activeOnFinish: (() => void) | null = null
  private readonly getViewer: () => Viewer | null

  constructor(getViewer: () => Viewer | null) {
    this.getViewer = getViewer
  }

  flyToLocation(target: CameraWaypoint | SceneLocation, callbacks: CameraFlightCallbacks = {}) {
    const viewer = this.getViewer()
    if (!viewer) return

    this.finishActiveFlight()
    const flightId = ++this.activeFlightId
    this.activeOnFinish = callbacks.onFinish ?? null
    callbacks.onStart?.()

    let targetLng: number
    let targetLat: number
    let targetHeight: number
    let targetHeading: number
    let targetPitch: number
    let targetRoll: number
    let targetDuration: number

    if ('city' in target || 'landmark' in target) {
      const loc = target as SceneLocation
      const view = loc.cameraView
      targetLng = view?.longitude ?? loc.lng
      targetLat = view?.latitude ?? loc.lat
      targetHeight = view?.height ?? 1200
      targetHeading = view?.headingDegrees ?? 0
      targetPitch = view?.pitchDegrees ?? -35
      targetRoll = view?.rollDegrees ?? 0
      targetDuration = view?.duration ?? 3.2
    } else {
      const wp = target as CameraWaypoint
      targetLng = wp.longitude
      targetLat = wp.latitude
      targetHeight = wp.height ?? 1200
      targetHeading = wp.headingDegrees ?? 0
      targetPitch = wp.pitchDegrees ?? -35
      targetRoll = wp.rollDegrees ?? 0
      targetDuration = wp.duration ?? 3.2
    }

    const camera = viewer.camera
    const startPosition = Cartesian3.clone(camera.positionWC)
    const endPosition = Cartesian3.fromDegrees(targetLng, targetLat, targetHeight)

    const startHeading = camera.heading
    const startPitch = camera.pitch
    const startRoll = camera.roll
    const endHeading = CesiumMath.toRadians(targetHeading)
    const endPitch = CesiumMath.toRadians(targetPitch)
    const endRoll = CesiumMath.toRadians(targetRoll)

    const progress = { value: 0 }
    let completed = false

    const tween = gsap.to(progress, {
      value: 1,
      duration: targetDuration,
      ease: 'power3.inOut',
      onUpdate: () => {
        const activeViewer = this.getViewer()
        if (!activeViewer) return

        Cartesian3.lerp(startPosition, endPosition, progress.value, flightCurrentPositionScratch)
        activeViewer.camera.setView({
          destination: flightCurrentPositionScratch,
          orientation: {
            heading: lerpRadians(startHeading, endHeading, progress.value),
            pitch: CesiumMath.lerp(startPitch, endPitch, progress.value),
            roll: CesiumMath.lerp(startRoll, endRoll, progress.value),
          },
        })
        activeViewer.scene.requestRender()
      },
      onComplete: () => {
        completed = true
        // requestRenderMode에서는 GSAP 카메라 이동이 끝난 뒤에도 한 프레임을 요청해야
        // 새 시점의 3D Tiles 요청/선택이 이어집니다.
        viewer?.scene.requestRender()
        if (this.activeFlightId === flightId) {
          this.activeTween = null
          this.activeOnFinish?.()
          this.activeOnFinish = null
        }
      },
    })

    if (!completed && this.activeFlightId === flightId) {
      this.activeTween = tween
    }
  }

  dispose() {
    this.finishActiveFlight()
  }

  private finishActiveFlight() {
    const hadActiveFlight = this.activeTween !== null || this.activeOnFinish !== null
    this.activeTween?.kill()
    this.activeTween = null
    this.activeFlightId += 1

    if (hadActiveFlight) {
      this.activeOnFinish?.()
    }
    this.activeOnFinish = null
  }
}
