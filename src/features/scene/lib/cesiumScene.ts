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

import { SEOUL_JAMSIL_VIEW } from '../model/scene.constants'
import type { CameraWaypoint, SceneWeatherState } from '../model/scene.types'
import { clamp, clamp01, lerpRadians } from './math'
import { getSceneDateFromLocalTime, getSkyPhase } from './sky'
import { getSnowstormIntensity, getWeatherTint } from './weather'

export function configureViewerScene(viewer: Viewer) {
  viewer.scene.backgroundColor = Color.fromCssColorString('#020617')
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

export function setInitialJamsilView(viewer: Viewer) {
  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(
      SEOUL_JAMSIL_VIEW.longitude,
      SEOUL_JAMSIL_VIEW.latitude,
      SEOUL_JAMSIL_VIEW.height,
    ),
    orientation: {
      heading: CesiumMath.toRadians(SEOUL_JAMSIL_VIEW.headingDegrees),
      pitch: CesiumMath.toRadians(SEOUL_JAMSIL_VIEW.pitchDegrees),
      roll: 0,
    },
  })
}

export function applyAtmosphereToScene(viewer: Viewer, state: SceneWeatherState) {
  const sky = getSkyPhase(state.time)
  const visibilityKm = clamp(state.visibility, 0.1, 30)
  const visibilityFactor = clamp01((20 - visibilityKm) / 20)
  const aqiHazeFactor = clamp01((state.aqi - 45) / 180)
  const precipitationHazeFactor = clamp01(state.precipitation / 16)
  const snowstormHazeFactor = getSnowstormIntensity(state)
  const nightFactor = 1 - sky.daylight
  const extinctionCoefficient = 3.912 / (visibilityKm * 1000)
  const fogDensity = clamp(
    extinctionCoefficient *
      (1 + aqiHazeFactor * 2.2 + precipitationHazeFactor * 0.9 + snowstormHazeFactor * 1.8),
    0.000045,
    0.0034,
  )
  const fogTint = getWeatherTint(state)
  viewer.scene.fog.enabled =
    visibilityKm < 22 || state.aqi > 65 || state.precipitation > 0.2 || snowstormHazeFactor > 0
  viewer.scene.fog.renderable = true
  viewer.scene.fog.density = fogDensity
  viewer.scene.fog.minimumBrightness = CesiumMath.lerp(0.018, 0.16, sky.daylight)
  viewer.scene.backgroundColor = Color.lerp(
    Color.fromCssColorString(sky.daylight > 0.1 ? '#0f2747' : '#020617'),
    fogTint,
    CesiumMath.lerp(
      0.08,
      0.28,
      Math.max(visibilityFactor, aqiHazeFactor, snowstormHazeFactor * 0.56),
    ),
    new Color(),
  )
  viewer.scene.fog.screenSpaceErrorFactor = CesiumMath.lerp(
    1.4,
    3.4,
    Math.max(visibilityFactor, snowstormHazeFactor),
  )
  viewer.scene.fog.visualDensityScalar = CesiumMath.lerp(
    0.16,
    0.72,
    Math.max(visibilityFactor, aqiHazeFactor, snowstormHazeFactor),
  )
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.atmosphereLightIntensity = CesiumMath.lerp(3.0, 12.0, sky.daylight)
    viewer.scene.skyAtmosphere.hueShift =
      CesiumMath.lerp(-0.08, 0.02, sky.daylight) + aqiHazeFactor * 0.06
    viewer.scene.skyAtmosphere.saturationShift =
      CesiumMath.lerp(-0.18, 0.08, sky.daylight) - visibilityFactor * 0.14 + aqiHazeFactor * 0.08
    viewer.scene.skyAtmosphere.brightnessShift =
      CesiumMath.lerp(-0.55, 0.12, sky.daylight) -
      precipitationHazeFactor * 0.1 -
      snowstormHazeFactor * 0.1
  }
  if (viewer.scene.light instanceof SunLight) {
    viewer.scene.light.intensity = CesiumMath.lerp(0.05, 2.0, sky.daylight)
  }
  if (viewer.scene.sun) {
    viewer.scene.sun.glowFactor = CesiumMath.lerp(1.1, 3.1, sky.horizonGlow)
  }
  if (viewer.scene.moon) {
    viewer.scene.moon.show = nightFactor > 0.25
  }
  viewer.scene.requestRender()
}

export function applySceneTime(viewer: Viewer, state: SceneWeatherState) {
  const currentTime = JulianDate.fromDate(getSceneDateFromLocalTime(state.time))
  const startTime = JulianDate.fromDate(getSceneDateFromLocalTime(0))
  const stopTime = JulianDate.fromDate(getSceneDateFromLocalTime(24))

  viewer.clock.startTime = startTime
  viewer.clock.stopTime = stopTime
  viewer.clock.currentTime = currentTime
  viewer.clock.clockRange = ClockRange.LOOP_STOP
  viewer.clock.shouldAnimate = false
  viewer.clock.multiplier = 1
  viewer.scene.requestRender()
}

export class CameraFlyToController {
  private activeTween: gsap.core.Tween | null = null
  private readonly getViewer: () => Viewer | null

  constructor(getViewer: () => Viewer | null) {
    this.getViewer = getViewer
  }

  flyToLocation(target: CameraWaypoint) {
    const viewer = this.getViewer()
    if (!viewer) return

    this.activeTween?.kill()

    const camera = viewer.camera
    const startPosition = Cartesian3.clone(camera.positionWC)
    const endPosition = Cartesian3.fromDegrees(
      target.longitude,
      target.latitude,
      target.height ?? SEOUL_JAMSIL_VIEW.height,
    )
    const startHeading = camera.heading
    const startPitch = camera.pitch
    const startRoll = camera.roll
    const endHeading = CesiumMath.toRadians(
      target.headingDegrees ?? SEOUL_JAMSIL_VIEW.headingDegrees,
    )
    const endPitch = CesiumMath.toRadians(target.pitchDegrees ?? SEOUL_JAMSIL_VIEW.pitchDegrees)
    const endRoll = CesiumMath.toRadians(target.rollDegrees ?? 0)
    const progress = { value: 0 }
    const currentPosition = new Cartesian3()

    this.activeTween = gsap.to(progress, {
      value: 1,
      duration: target.duration ?? 3.2,
      ease: 'power3.inOut',
      onUpdate: () => {
        const activeViewer = this.getViewer()
        if (!activeViewer) return

        Cartesian3.lerp(startPosition, endPosition, progress.value, currentPosition)
        camera.setView({
          destination: currentPosition,
          orientation: {
            heading: lerpRadians(startHeading, endHeading, progress.value),
            pitch: CesiumMath.lerp(startPitch, endPitch, progress.value),
            roll: CesiumMath.lerp(startRoll, endRoll, progress.value),
          },
        })
      },
      onComplete: () => {
        this.activeTween = null
      },
    })
  }

  dispose() {
    this.activeTween?.kill()
    this.activeTween = null
  }
}
