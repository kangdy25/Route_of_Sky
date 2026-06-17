<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { Cartesian3, Cesium3DTileset, Color, Ion, Math as CesiumMath, Viewer } from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { cesiumIonAccessToken, hasCesiumIonAccessToken } from '@/shared/config/env'

const GOOGLE_3D_TILES_ION_ASSET_ID = 2275207
const MANHATTAN_VIEW = {
  longitude: -74.006,
  latitude: 40.7128,
  height: 1850,
  headingDegrees: 28,
  pitchDegrees: -43,
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

let viewer: Viewer | null = null
let activeCameraTween: gsap.core.Tween | null = null
let destroyed = false

const atmosphereOverlayStyle = computed(() => {
  const cloudAlpha = Math.min(0.34, Math.max(0.04, props.cloudCover / 280))
  const rainAlpha = Math.min(0.22, Math.max(0, props.precipitation / 360))
  const hazeAlpha = Math.min(0.28, Math.max(0.02, (20 - props.visibility) / 80 + props.aqi / 900))

  return {
    background: `linear-gradient(180deg, rgba(15, 23, 42, ${cloudAlpha}) 0%, rgba(8, 13, 25, ${rainAlpha}) 52%, rgba(2, 6, 23, ${hazeAlpha}) 100%)`,
  }
})

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
    shouldAnimate: true,
  })

  viewer.scene.backgroundColor = Color.fromCssColorString('#020617')
  viewer.scene.fog.enabled = true
  viewer.scene.globe.show = false
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 80
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 30000

  setInitialManhattanView()
  applyAtmosphereToScene()

  if (hasCesiumIonAccessToken) {
    void loadGooglePhotorealisticTiles()
  } else {
    statusMessage.value = 'Cesium ion token required for Google 3D Tiles'
  }
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

  const visibilityFactor = Math.max(0, Math.min(1, (20 - props.visibility) / 20))
  const weatherFactor = Math.max(props.cloudCover, props.precipitation, props.aqi) / 100
  viewer.scene.fog.density = CesiumMath.lerp(
    0.00005,
    0.00038,
    Math.max(visibilityFactor, weatherFactor * 0.35),
  )
  viewer.scene.fog.minimumBrightness = props.time >= 6 && props.time <= 18 ? 0.08 : 0.02
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
  () => applyAtmosphereToScene(),
)

onMounted(async () => {
  await nextTick()
  initializeViewer()
})

onBeforeUnmount(() => {
  destroyed = true
  activeCameraTween?.kill()
  activeCameraTween = null

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
    <div id="cesiumContainer" ref="cesiumContainer" class="absolute inset-0 h-full w-full"></div>
    <div
      class="pointer-events-none absolute inset-0 mix-blend-screen"
      :style="atmosphereOverlayStyle"
    ></div>
    <div
      v-if="statusMessage || isTilesLoading"
      class="pointer-events-none absolute bottom-5 left-5 rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-xs font-bold tracking-[0.18em] text-cyan-200 uppercase backdrop-blur-md"
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
}

#cesiumContainer :deep(.cesium-viewer-bottom) {
  bottom: 0.75rem;
  left: 1rem;
}
</style>
