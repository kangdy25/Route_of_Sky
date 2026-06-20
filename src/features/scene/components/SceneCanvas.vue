<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import {
  CameraEventType,
  Cartesian2,
  Cartesian3,
  Cesium3DTileset,
  ClockRange,
  Color,
  DynamicAtmosphereLightingType,
  Ion,
  JulianDate,
  KeyboardEventModifier,
  Matrix3,
  Math as CesiumMath,
  SceneTransforms,
  Simon1994PlanetaryPositions,
  SunLight,
  Transforms,
  Viewer,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { cesiumIonAccessToken, hasCesiumIonAccessToken } from '@/shared/config/env'

const GOOGLE_3D_TILES_ION_ASSET_ID = 2275207
const MANHATTAN_TIMEZONE_OFFSET_HOURS = 4
const SCENE_DATE = {
  year: 2026,
  monthIndex: 5,
  day: 20,
}
const MANHATTAN_VIEW = {
  longitude: -74.006,
  latitude: 40.7128,
  height: 1850,
  headingDegrees: 28,
  pitchDegrees: -43,
}
const MANHATTAN_SUMMER_SOLAR = {
  sunriseStart: 4.7,
  sunrise: 5.4,
  solarNoon: 13.0,
  sunset: 20.5,
  duskEnd: 21.3,
}

interface CameraWaypoint {
  longitude: number
  latitude: number
  height?: number
  headingDegrees?: number
  pitchDegrees?: number
  rollDegrees?: number
  duration?: number
}

const props = withDefaults(
  defineProps<{
    time?: number
    cloudCover?: number
    precipitation?: number
    aqi?: number
    visibility?: number
  }>(),
  {
    time: 16.5,
    cloudCover: 65,
    precipitation: 0.0,
    aqi: 45,
    visibility: 15.0,
  },
)

const cesiumContainer = ref<HTMLDivElement | null>(null)
const isTilesLoading = ref(false)
const statusMessage = ref('')
const sunGlowStyle = ref<Record<string, string | number>>({ opacity: 0 })

let viewer: Viewer | null = null
let activeCameraTween: gsap.core.Tween | null = null
let removeSunGlowUpdater: (() => void) | null = null
let destroyed = false
const sunTransformScratch = new Matrix3()
const sunPositionScratch = new Cartesian3()
const sunWindowScratch = new Cartesian2()
const sunToCameraScratch = new Cartesian3()

const atmosphereOverlayStyle = computed(() => {
  const sky = getSkyPhase(props.time)
  const cloudAlpha = Math.min(0.34, Math.max(0.04, props.cloudCover / 280))
  const rainAlpha = Math.min(0.22, Math.max(0, props.precipitation / 360))
  const hazeAlpha = Math.min(0.28, Math.max(0.02, (20 - props.visibility) / 80 + props.aqi / 900))
  const dimFactor = CesiumMath.lerp(0.92, 0.42, sky.daylight)

  return {
    background: `radial-gradient(circle at 50% 35%, rgba(34, 211, 238, ${0.04 + sky.daylight * 0.04}), rgba(2, 6, 23, ${0.16 * dimFactor}) 52%, rgba(2, 6, 23, ${0.48 * dimFactor}) 100%), linear-gradient(180deg, rgba(15, 23, 42, ${cloudAlpha * dimFactor}) 0%, rgba(8, 13, 25, ${(rainAlpha + 0.12) * dimFactor}) 52%, rgba(2, 6, 23, ${(hazeAlpha + 0.2) * dimFactor}) 100%)`,
  }
})

const skyTimeStyle = computed(() => {
  const sky = getSkyPhase(props.time)
  const dawnWarmth = sky.dawn + sky.dusk
  const nightOpacity = 1 - sky.daylight
  const dayBlue = 0.28 + sky.daylight * 0.42
  const horizonWarmth = 0.12 + dawnWarmth * 0.58

  return {
    opacity: CesiumMath.lerp(0.66, 0.88, sky.daylight),
    background: `radial-gradient(ellipse at 50% 82%, rgba(251, 146, 60, ${horizonWarmth}), rgba(244, 114, 182, ${dawnWarmth * 0.26}) 30%, rgba(168, 85, 247, ${dawnWarmth * 0.1}) 54%, transparent 72%), linear-gradient(180deg, rgba(56, 189, 248, ${dayBlue}) 0%, rgba(125, 211, 252, ${0.12 + sky.daylight * 0.18}) 32%, rgba(252, 211, 77, ${dawnWarmth * 0.2}) 56%, rgba(249, 115, 22, ${dawnWarmth * 0.22}) 74%, rgba(15, 23, 42, ${0.72 * nightOpacity}) 100%)`,
  }
})

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function getSkyPhase(time: number) {
  const localTime = ((time % 24) + 24) % 24
  const solar = MANHATTAN_SUMMER_SOLAR
  const morningLight = smoothstep(solar.sunriseStart, solar.sunrise + 0.8, localTime)
  const eveningFade = 1 - smoothstep(solar.sunset - 1.0, solar.duskEnd, localTime)
  const daylight = clamp01(morningLight * eveningFade)
  const dawn = clamp01(1 - Math.abs(localTime - solar.sunrise) / 1.65)
  const dusk = clamp01(1 - Math.abs(localTime - solar.sunset) / 1.8)
  const horizonGlow = Math.max(dawn, dusk)

  return {
    daylight,
    dawn,
    dusk,
    horizonGlow,
  }
}

function getSceneDateFromLocalTime(time: number) {
  const hour = Math.floor(time)
  const minutes = Math.round((time - hour) * 60)

  return new Date(
    Date.UTC(
      SCENE_DATE.year,
      SCENE_DATE.monthIndex,
      SCENE_DATE.day,
      hour + MANHATTAN_TIMEZONE_OFFSET_HOURS,
      minutes,
    ),
  )
}

function getSunPositionForTime(time: JulianDate, result: Cartesian3) {
  const transform =
    Transforms.computeIcrfToCentralBodyFixedMatrix(time, sunTransformScratch) ??
    Transforms.computeTemeToPseudoFixedMatrix(time, sunTransformScratch)
  const inertialPosition = Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(
    time,
    result,
  )

  return Matrix3.multiplyByVector(transform, inertialPosition, result)
}

function updateSunGlowPosition() {
  if (!viewer || viewer.isDestroyed()) {
    sunGlowStyle.value = { opacity: 0 }
    return
  }

  const sky = getSkyPhase(props.time)
  const sunPosition = getSunPositionForTime(viewer.clock.currentTime, sunPositionScratch)
  const toSun = Cartesian3.subtract(sunPosition, viewer.camera.positionWC, sunToCameraScratch)
  const isInFrontOfCamera = Cartesian3.dot(toSun, viewer.camera.directionWC) > 0
  const windowPosition = isInFrontOfCamera
    ? SceneTransforms.worldToWindowCoordinates(viewer.scene, sunPosition, sunWindowScratch)
    : undefined

  if (!windowPosition) {
    sunGlowStyle.value = { opacity: 0 }
    return
  }

  const horizonBoost = CesiumMath.lerp(0.64, 1.0, sky.horizonGlow)
  sunGlowStyle.value = {
    left: `${windowPosition.x}px`,
    top: `${windowPosition.y}px`,
    opacity: sky.daylight * horizonBoost,
    transform: 'translate(-50%, -50%)',
  }
}

function initializeViewer() {
  if (!cesiumContainer.value) return

  if (hasCesiumIonAccessToken) {
    Ion.defaultAccessToken = cesiumIonAccessToken
  }

  viewer = new Viewer(cesiumContainer.value, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    baseLayer: false,
    shouldAnimate: false,
  })

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
  configureCameraControls()

  setInitialManhattanView()
  removeSunGlowUpdater = viewer.scene.postRender.addEventListener(updateSunGlowPosition)
  applySceneTime()
  applyAtmosphereToScene()

  if (hasCesiumIonAccessToken) {
    void loadGooglePhotorealisticTiles()
  } else {
    statusMessage.value = 'Cesium ion token required for Google 3D Tiles'
  }
}

function configureCameraControls() {
  if (!viewer) return

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

function setInitialManhattanView() {
  if (!viewer) return

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(
      MANHATTAN_VIEW.longitude,
      MANHATTAN_VIEW.latitude,
      MANHATTAN_VIEW.height,
    ),
    orientation: {
      heading: CesiumMath.toRadians(MANHATTAN_VIEW.headingDegrees),
      pitch: CesiumMath.toRadians(MANHATTAN_VIEW.pitchDegrees),
      roll: 0,
    },
  })
}

async function loadGooglePhotorealisticTiles() {
  if (!viewer) return

  isTilesLoading.value = true
  statusMessage.value = 'Loading Google Photorealistic 3D Tiles'

  try {
    const tileset = await Cesium3DTileset.fromIonAssetId(GOOGLE_3D_TILES_ION_ASSET_ID, {
      maximumScreenSpaceError: 2,
      cullWithChildrenBounds: true,
    })

    if (!viewer || destroyed) return

    viewer.scene.primitives.add(tileset)
    statusMessage.value = ''
  } catch (error) {
    console.error(error)
    statusMessage.value = 'Unable to load Google 3D Tiles asset'
  } finally {
    isTilesLoading.value = false
  }
}

function applyAtmosphereToScene() {
  if (!viewer) return

  const sky = getSkyPhase(props.time)
  const visibilityFactor = Math.max(0, Math.min(1, (20 - props.visibility) / 20))
  const weatherFactor = Math.max(props.cloudCover, props.precipitation, props.aqi) / 100
  const nightFactor = 1 - sky.daylight
  viewer.scene.fog.density = CesiumMath.lerp(
    0.00005,
    0.00038,
    Math.max(visibilityFactor, weatherFactor * 0.35),
  )
  viewer.scene.fog.minimumBrightness = CesiumMath.lerp(0.02, 0.12, sky.daylight)
  viewer.scene.backgroundColor = Color.fromCssColorString(
    sky.daylight > 0.1 ? '#0f2747' : '#020617',
  )
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.atmosphereLightIntensity = CesiumMath.lerp(3.0, 12.0, sky.daylight)
    viewer.scene.skyAtmosphere.hueShift = CesiumMath.lerp(-0.08, 0.02, sky.daylight)
    viewer.scene.skyAtmosphere.saturationShift = CesiumMath.lerp(-0.18, 0.08, sky.daylight)
    viewer.scene.skyAtmosphere.brightnessShift = CesiumMath.lerp(-0.55, 0.12, sky.daylight)
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

function applySceneTime() {
  if (!viewer) return

  const currentTime = JulianDate.fromDate(getSceneDateFromLocalTime(props.time))
  const startTime = JulianDate.fromDate(getSceneDateFromLocalTime(0))
  const stopTime = JulianDate.fromDate(getSceneDateFromLocalTime(24))

  viewer.clock.startTime = startTime
  viewer.clock.stopTime = stopTime
  viewer.clock.currentTime = currentTime
  viewer.clock.clockRange = ClockRange.LOOP_STOP
  viewer.clock.shouldAnimate = false
  viewer.clock.multiplier = 1
  updateSunGlowPosition()
  viewer.scene.requestRender()
}

function lerpRadians(start: number, end: number, progress: number) {
  const tau = Math.PI * 2
  const delta = ((((end - start + Math.PI) % tau) + tau) % tau) - Math.PI
  return start + delta * progress
}

function flyToLocation(target: CameraWaypoint) {
  if (!viewer) return

  activeCameraTween?.kill()

  const camera = viewer.camera
  const startPosition = Cartesian3.clone(camera.positionWC)
  const endPosition = Cartesian3.fromDegrees(
    target.longitude,
    target.latitude,
    target.height ?? MANHATTAN_VIEW.height,
  )
  const startHeading = camera.heading
  const startPitch = camera.pitch
  const startRoll = camera.roll
  const endHeading = CesiumMath.toRadians(target.headingDegrees ?? MANHATTAN_VIEW.headingDegrees)
  const endPitch = CesiumMath.toRadians(target.pitchDegrees ?? MANHATTAN_VIEW.pitchDegrees)
  const endRoll = CesiumMath.toRadians(target.rollDegrees ?? 0)
  const progress = { value: 0 }
  const currentPosition = new Cartesian3()

  activeCameraTween = gsap.to(progress, {
    value: 1,
    duration: target.duration ?? 3.2,
    ease: 'power3.inOut',
    onUpdate: () => {
      if (!viewer) return

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
      activeCameraTween = null
    },
  })
}

watch(
  () => [props.time, props.cloudCover, props.precipitation, props.aqi, props.visibility],
  () => {
    applySceneTime()
    applyAtmosphereToScene()
  },
)

onMounted(async () => {
  await nextTick()
  initializeViewer()
})

onBeforeUnmount(() => {
  destroyed = true
  activeCameraTween?.kill()
  activeCameraTween = null
  removeSunGlowUpdater?.()
  removeSunGlowUpdater = null

  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
  }

  viewer = null
})

defineExpose({
  flyToLocation,
})
</script>

<template>
  <section class="relative h-full w-full overflow-hidden bg-slate-950">
    <div
      id="cesiumContainer"
      ref="cesiumContainer"
      class="absolute inset-0 h-full w-full"
      @contextmenu.prevent
    ></div>
    <div class="pointer-events-none absolute inset-0 mix-blend-screen" :style="skyTimeStyle"></div>
    <div
      class="pointer-events-none absolute h-24 w-24 rounded-full bg-amber-100/80 mix-blend-screen shadow-[0_0_34px_rgba(253,224,71,0.88),0_0_110px_rgba(251,146,60,0.68),0_0_190px_rgba(244,114,182,0.36)]"
      :style="sunGlowStyle"
    ></div>
    <div class="pointer-events-none absolute inset-0" :style="atmosphereOverlayStyle"></div>
    <div
      v-if="statusMessage || isTilesLoading"
      class="pointer-events-none absolute bottom-5 left-5 rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm font-bold text-cyan-200 uppercase backdrop-blur-md"
    >
      {{ statusMessage }}
    </div>
  </section>
</template>

<style scoped>
#cesiumContainer :deep(.cesium-viewer),
#cesiumContainer :deep(.cesium-viewer-cesiumWidgetContainer),
#cesiumContainer :deep(.cesium-widget),
#cesiumContainer :deep(canvas) {
  width: 100%;
  height: 100%;
  background: #020617;
}

#cesiumContainer,
#cesiumContainer :deep(.cesium-viewer),
#cesiumContainer :deep(.cesium-widget) {
  background: #020617 !important;
}

#cesiumContainer :deep(.cesium-viewer-bottom) {
  bottom: 0.75rem;
  left: 1rem;
}
</style>
