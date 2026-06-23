<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Cartesian2,
  Cartesian3,
  Cesium3DTileset,
  Ion,
  Math as CesiumMath,
  SceneTransforms,
  Viewer,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { cesiumIonAccessToken, hasCesiumIonAccessToken } from '@/shared/config/env'
import { GOOGLE_3D_TILES_ION_ASSET_ID, LENS_DROPLETS } from '@/features/scene/model/scene.constants'
import type { CameraWaypoint, SceneWeatherState } from '@/features/scene/model/scene.types'
import {
  CameraFlyToController,
  applyAtmosphereToScene,
  applySceneTime,
  configureViewerScene,
  setInitialJamsilView,
} from '@/features/scene/lib/cesiumScene'
import { CloudController } from '@/features/scene/lib/clouds'
import {
  getAtmosphereOverlayStyle,
  getLensDropletStyle as resolveLensDropletStyle,
  getMistOverlayStyle,
  getSkyTimeStyle,
  getTwilightCloudGlowStyle,
  getWetLensOverlayStyle,
  getWhiteoutOverlayStyle,
} from '@/features/scene/lib/overlayStyles'
import { ScreenWeatherRenderer } from '@/features/scene/lib/screenWeather'
import { getSkyPhase, getSunPositionForTime } from '@/features/scene/lib/sky'
import { WeatherPostProcessController } from '@/features/scene/lib/weatherPostProcess'

const props = withDefaults(
  defineProps<{
    time?: number
    cloudCover?: number
    precipitation?: number
    aqi?: number
    visibility?: number
    temperature?: number
    windSpeed?: number
    windDirectionDegrees?: number
    humidity?: number
  }>(),
  {
    time: 16.5,
    cloudCover: 65,
    precipitation: 0.0,
    aqi: 45,
    visibility: 15.0,
    temperature: 18,
    windSpeed: 3.2,
    windDirectionDegrees: 225,
    humidity: 62,
  },
)

const cesiumContainer = ref<HTMLDivElement | null>(null)
const precipitationCanvas = ref<HTMLCanvasElement | null>(null)
const isTilesLoading = ref(false)
const statusMessage = ref('')
const sunGlowStyle = ref<Record<string, string | number>>({ opacity: 0 })

let viewer: Viewer | null = null
let removeSunGlowUpdater: (() => void) | null = null
let destroyed = false

const sunPositionScratch = new Cartesian3()
const sunWindowScratch = new Cartesian2()
const sunToCameraScratch = new Cartesian3()

const sceneState = computed<SceneWeatherState>(() => ({
  time: props.time,
  cloudCover: props.cloudCover,
  precipitation: props.precipitation,
  aqi: props.aqi,
  visibility: props.visibility,
  temperature: props.temperature,
  windSpeed: props.windSpeed,
  windDirectionDegrees: props.windDirectionDegrees,
  humidity: props.humidity,
}))

const cloudController = new CloudController(
  () => viewer,
  () => sceneState.value,
)
const weatherPostProcessController = new WeatherPostProcessController(
  () => viewer,
  () => sceneState.value,
)
const screenWeatherRenderer = new ScreenWeatherRenderer(precipitationCanvas, () => sceneState.value)
const cameraController = new CameraFlyToController(() => viewer)

const atmosphereOverlayStyle = computed(() => getAtmosphereOverlayStyle(sceneState.value))
const mistOverlayStyle = computed(() => getMistOverlayStyle(sceneState.value))
const wetLensOverlayStyle = computed(() => getWetLensOverlayStyle(sceneState.value))
const whiteoutOverlayStyle = computed(() => getWhiteoutOverlayStyle(sceneState.value))
const skyTimeStyle = computed(() => getSkyTimeStyle(sceneState.value))
const twilightCloudGlowStyle = computed(() => getTwilightCloudGlowStyle(sceneState.value))

function getLensDropletStyle(droplet: (typeof LENS_DROPLETS)[number]) {
  return resolveLensDropletStyle(droplet, sceneState.value)
}

function updateSunGlowPosition() {
  if (!viewer || viewer.isDestroyed()) {
    sunGlowStyle.value = { opacity: 0 }
    return
  }

  const sky = getSkyPhase(sceneState.value.time)
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

function applySceneState() {
  if (!viewer) return

  applySceneTime(viewer, sceneState.value)
  updateSunGlowPosition()
  applyAtmosphereToScene(viewer, sceneState.value)
  cloudController.update()
  weatherPostProcessController.update()
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

  configureViewerScene(viewer)
  setInitialJamsilView(viewer)
  removeSunGlowUpdater = viewer.scene.postRender.addEventListener(updateSunGlowPosition)
  applySceneState()

  if (hasCesiumIonAccessToken) {
    void loadGooglePhotorealisticTiles()
  } else {
    statusMessage.value = 'Cesium ion token required for Google 3D Tiles'
  }
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

function flyToLocation(target: CameraWaypoint) {
  cameraController.flyToLocation(target)
}

watch(
  () => [
    props.time,
    props.cloudCover,
    props.precipitation,
    props.aqi,
    props.visibility,
    props.temperature,
    props.windSpeed,
    props.windDirectionDegrees,
    props.humidity,
  ],
  applySceneState,
)

onMounted(async () => {
  await nextTick()
  screenWeatherRenderer.start()
  initializeViewer()
})

onBeforeUnmount(() => {
  destroyed = true
  cameraController.dispose()
  removeSunGlowUpdater?.()
  removeSunGlowUpdater = null
  cloudController.dispose()
  weatherPostProcessController.dispose()
  screenWeatherRenderer.stop()

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
      class="pointer-events-none absolute inset-0 mix-blend-screen"
      :style="twilightCloudGlowStyle"
    ></div>
    <div
      class="pointer-events-none absolute h-24 w-24 rounded-full bg-amber-100/80 mix-blend-screen shadow-[0_0_34px_rgba(253,224,71,0.88),0_0_110px_rgba(251,146,60,0.68),0_0_190px_rgba(180,83,9,0.32)]"
      :style="sunGlowStyle"
    ></div>
    <div class="pointer-events-none absolute inset-0" :style="atmosphereOverlayStyle"></div>
    <div class="pointer-events-none absolute inset-0" :style="mistOverlayStyle"></div>
    <canvas
      ref="precipitationCanvas"
      class="pointer-events-none absolute inset-0 h-full w-full"
    ></canvas>
    <div class="pointer-events-none absolute inset-0" :style="whiteoutOverlayStyle"></div>
    <div class="pointer-events-none absolute inset-0" :style="wetLensOverlayStyle">
      <span
        v-for="droplet in LENS_DROPLETS"
        :key="`${droplet.left}-${droplet.top}`"
        class="lens-droplet absolute"
        :style="getLensDropletStyle(droplet)"
      ></span>
    </div>
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

.lens-droplet {
  border-radius: 9999px 9999px 9999px 9999px / 78% 78% 118% 118%;
  background:
    radial-gradient(circle at 28% 20%, rgba(255, 255, 255, 0.95), transparent 14%),
    radial-gradient(circle at 70% 84%, rgba(14, 165, 233, 0.34), transparent 46%),
    linear-gradient(145deg, rgba(241, 245, 249, 0.42), rgba(15, 23, 42, 0.18));
  border: 1px solid rgba(241, 245, 249, 0.42);
  box-shadow:
    inset 5px 7px 12px rgba(255, 255, 255, 0.26),
    inset -7px -10px 16px rgba(15, 23, 42, 0.28),
    0 3px 14px rgba(2, 6, 23, 0.26),
    0 0 24px rgba(125, 211, 252, 0.18);
  backdrop-filter: blur(3.4px) saturate(1.35) contrast(1.08);
}

.lens-droplet::after {
  position: absolute;
  right: 20%;
  bottom: 12%;
  width: 34%;
  height: 18%;
  content: '';
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.22);
  filter: blur(1px);
}
</style>
