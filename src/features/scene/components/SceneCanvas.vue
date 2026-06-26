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
import {
  GOOGLE_3D_TILES_ION_ASSET_ID,
  WORLD_LOCATIONS,
} from '@/features/scene/model/scene.constants'
import type {
  CameraWaypoint,
  SceneLocation,
  SceneWeatherState,
} from '@/features/scene/model/scene.types'
import {
  CameraFlyToController,
  applyAtmosphereToScene,
  applySceneTime,
  configureViewerScene,
  setInitialTimesSquareView,
} from '@/features/scene/lib/cesiumScene'
import { CloudController } from '@/features/scene/lib/clouds'
import {
  getAtmosphereOverlayStyle,
  getMistOverlayStyle,
  getSkyTimeStyle,
  getTwilightCloudGlowStyle,
  getWhiteoutOverlayStyle,
} from '@/features/scene/lib/overlayStyles'
import { ScreenWeatherRenderer } from '@/features/scene/lib/screenWeather'
import { getSkyPhase, getSunPositionForTime } from '@/features/scene/lib/sky'
import { WeatherPostProcessController } from '@/features/scene/lib/weatherPostProcess'

// 이 컴포넌트는 Cesium Viewer와 Vue 템플릿을 연결하는 조립자 역할만 맡습니다.
// 실제 날씨 계산, 캔버스 렌더링, primitive 관리는 각 lib 모듈에 위임합니다.
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
    location?: SceneLocation
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
    location: () => WORLD_LOCATIONS[1],
  },
)

const cesiumContainer = ref<HTMLDivElement | null>(null)
const precipitationCanvas = ref<HTMLCanvasElement | null>(null)
const isTilesLoading = ref(false)
const statusMessage = ref('')
const sunGlowStyle = ref<Record<string, string | number>>({ opacity: 0 })

let viewer: Viewer | null = null
let removeSunGlowUpdater: (() => void) | null = null
let stopTilesetRenderSync: (() => void) | null = null
let destroyed = false

const sunPositionScratch = new Cartesian3()
const sunWindowScratch = new Cartesian2()
const sunToCameraScratch = new Cartesian3()

// props를 모듈들이 공유할 수 있는 단일 상태 객체로 정규화합니다.
// 계산 모듈은 Vue props에 직접 의존하지 않고 SceneWeatherState만 받습니다.
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
  () => props.location,
)
const weatherPostProcessController = new WeatherPostProcessController(
  () => viewer,
  () => sceneState.value,
)
const screenWeatherRenderer = new ScreenWeatherRenderer(precipitationCanvas, () => sceneState.value)
const cameraController = new CameraFlyToController(() => viewer)

const atmosphereOverlayStyle = computed(() => getAtmosphereOverlayStyle(sceneState.value))
const mistOverlayStyle = computed(() => getMistOverlayStyle(sceneState.value))
const whiteoutOverlayStyle = computed(() => getWhiteoutOverlayStyle(sceneState.value))
const skyTimeStyle = computed(() => getSkyTimeStyle(sceneState.value))
const twilightCloudGlowStyle = computed(() => getTwilightCloudGlowStyle(sceneState.value))

function updateSunGlowPosition() {
  if (!viewer || viewer.isDestroyed()) {
    sunGlowStyle.value = { opacity: 0 }
    return
  }

  const sky = getSkyPhase(sceneState.value.time)
  const sunPosition = getSunPositionForTime(viewer.clock.currentTime, sunPositionScratch)
  const toSun = Cartesian3.subtract(sunPosition, viewer.camera.positionWC, sunToCameraScratch)
  // 태양이 카메라 뒤에 있을 때는 DOM glow를 숨겨 Cesium 태양 위치와 어긋나지 않게 합니다.
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
  screenWeatherRenderer.update()

  /* v8 ignore next -- Vue lifecycle 밖에서 호출될 때를 위한 방어 guard입니다. */
  if (!viewer) return

  // 시간 변경은 태양, 대기, 구름, 후처리 uniform에 모두 영향을 주므로 한 진입점에서 동기화합니다.
  applySceneTime(viewer, sceneState.value)
  updateSunGlowPosition()
  applyAtmosphereToScene(viewer, sceneState.value)
  cloudController.update()
  weatherPostProcessController.update()
}

function initializeViewer() {
  /* v8 ignore next -- 템플릿 ref가 비어 있는 비정상 마운트 방어 guard입니다. */
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
    useDefaultRenderLoop: true,
    requestRenderMode: false,
  })

  configureViewerScene(viewer)
  setInitialTimesSquareView(viewer)
  removeSunGlowUpdater = viewer.scene.postRender.addEventListener(updateSunGlowPosition)
  applySceneState()

  if (hasCesiumIonAccessToken) {
    void loadGooglePhotorealisticTiles()
  } else {
    statusMessage.value = 'Cesium ion token required for Google 3D Tiles'
  }
}

async function loadGooglePhotorealisticTiles() {
  /* v8 ignore next -- private async 진입점의 viewer 소실 방어 guard입니다. */
  if (!viewer) return

  stopTilesetRenderSync?.()
  stopTilesetRenderSync = null
  isTilesLoading.value = true
  statusMessage.value = 'Loading Google Photorealistic 3D Tiles'

  try {
    const tileset = await Cesium3DTileset.fromIonAssetId(GOOGLE_3D_TILES_ION_ASSET_ID, {
      maximumScreenSpaceError: 16,
      cullWithChildrenBounds: true,
      cullRequestsWhileMoving: false,
      dynamicScreenSpaceError: true,
      foveatedScreenSpaceError: true,
      foveatedConeSize: 0.55,
      foveatedTimeDelay: 0,
      progressiveResolutionHeightFraction: 0.35,
      skipLevelOfDetail: true,
      baseScreenSpaceError: 1024,
      skipScreenSpaceErrorFactor: 16,
      skipLevels: 1,
      immediatelyLoadDesiredLevelOfDetail: false,
      loadSiblings: true,
    })

    if (!viewer || destroyed) return

    viewer.scene.primitives.add(tileset)
    setInitialTimesSquareView(viewer)
    stopTilesetRenderSync = keepRenderingUntilInitialTilesLoaded(viewer, tileset, () => {
      if (destroyed) return

      isTilesLoading.value = false
      statusMessage.value = ''
    })
  } catch (error) {
    console.error(error)
    statusMessage.value = 'Unable to load Google 3D Tiles asset'
    isTilesLoading.value = false
  }
}

function keepRenderingUntilInitialTilesLoaded(
  activeViewer: Viewer,
  tileset: Cesium3DTileset,
  onInitialTilesLoaded: () => void,
) {
  let animationFrame = 0
  let stopped = false
  let initialTilesSettled = false
  const startedAt = window.performance.now()
  const removeListeners: Array<() => void> = []

  const requestRender = () => {
    if (destroyed || activeViewer.isDestroyed()) return

    activeViewer.scene.requestRender()
  }

  const renderFrame = () => {
    if (destroyed || activeViewer.isDestroyed()) return

    // 첫 로드에서는 사용자가 카메라를 건드리지 않아도 3D Tiles traversal과 요청 큐가 즉시 진행되게 합니다.
    activeViewer.forceResize()
    activeViewer.scene.requestRender()
    activeViewer.render()
  }

  const stop = () => {
    if (stopped) return

    stopped = true
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame)
    }
    for (const removeListener of removeListeners) {
      removeListener()
    }
    /* v8 ignore next -- 이전 tileset stop 함수가 뒤늦게 호출될 때의 stale guard입니다. */
    if (stopTilesetRenderSync === stop) {
      stopTilesetRenderSync = null
    }
  }

  const settleInitialTiles = () => {
    if (initialTilesSettled) return

    initialTilesSettled = true
    tileset.maximumScreenSpaceError = 2
    onInitialTilesLoaded()
    requestRender()
  }

  const finishInitialLoad = () => {
    renderFrame()
    settleInitialTiles()
    stop()
  }

  const tick = () => {
    if (stopped) return

    renderFrame()
    if (window.performance.now() - startedAt > 15000) {
      settleInitialTiles()
      stop()
      return
    }

    animationFrame = window.requestAnimationFrame(tick)
  }

  removeListeners.push(
    tileset.tileLoad.addEventListener(() => {
      requestRender()
      settleInitialTiles()
    }),
  )
  removeListeners.push(tileset.loadProgress.addEventListener(requestRender))
  removeListeners.push(tileset.initialTilesLoaded.addEventListener(finishInitialLoad))
  removeListeners.push(tileset.allTilesLoaded.addEventListener(finishInitialLoad))

  renderFrame()
  animationFrame = window.requestAnimationFrame(tick)

  return stop
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
    props.location.id,
  ],
  applySceneState,
)

onMounted(async () => {
  await nextTick()
  screenWeatherRenderer.update()
  initializeViewer()
})

onBeforeUnmount(() => {
  destroyed = true
  cameraController.dispose()
  stopTilesetRenderSync?.()
  stopTilesetRenderSync = null
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
