<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Cartesian2, Cartesian3, Cesium3DTileset, Ion, Math as CesiumMath, SceneTransforms, Viewer } from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { cesiumIonAccessToken, hasCesiumIonAccessToken } from '@/shared/config/env'
import { GOOGLE_3D_TILES_ION_ASSET_ID, WORLD_LOCATIONS } from '@/features/scene/model/scene.constants'
import type {
  CameraWaypoint,
  SceneLocation,
  SceneQualityLevel,
  SceneQualityMode,
  SceneWeatherState,
} from '@/features/scene/model/scene.types'
import {
  CameraFlyToController,
  applyAtmosphereToScene,
  applySceneTime,
  configureViewerScene,
  setInitialLocationView,
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
import {
  AdaptiveSceneQualityController,
  getRecommendedAutoQuality,
  SCENE_QUALITY_PROFILES,
} from '@/features/scene/lib/sceneQuality'
import { getSkyPhase, getSunPositionForTime } from '@/features/scene/lib/sky'
import { WeatherPostProcessController } from '@/features/scene/lib/weatherPostProcess'

/** 초기 3D 타일셋의 점진적 로딩이 완료되지 않더라도 강제로 안정화 처리할 타임아웃 제한 시간 (ms) */
const TILESET_WARMUP_TIMEOUT_MS = 6000
/** 타일 요청 및 처리 큐가 완전히 비어 초기 시야가 안정화되었다고 간주하는 무작업 대기 시간 (ms) */
const INITIAL_VIEW_IDLE_WINDOW_MS = 500

// Cesium Viewer와 Vue 템플릿을 연결하는 조립자 역할만 맡습니다.
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
    qualityMode?: SceneQualityMode
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
    qualityMode: 'auto',
  },
)

const emit = defineEmits<{
  /** 적응형 품질 제어기에 의해 실제 렌더링 품질 레벨이 변경될 때 발생 */
  'update:effectiveQuality': [level: SceneQualityLevel]
  cameraFlightStart: []
  cameraFlightEnd: []
}>()

const cesiumContainer = ref<HTMLDivElement | null>(null)
const precipitationCanvas = ref<HTMLCanvasElement | null>(null)
const sunGlowRef = ref<HTMLDivElement | null>(null)
const isTilesLoading = ref(false)
const statusMessage = ref('')
const effectiveQuality = ref<SceneQualityLevel>(
  props.qualityMode === 'auto' ? getRecommendedAutoQuality() : props.qualityMode,
)

let viewer: Viewer | null = null
let removeSunGlowUpdater: (() => void) | null = null
let stopTilesetRenderSync: (() => void) | null = null
let destroyed = false
let mounted = false
let sceneUpdateFrame = 0
let lastAppliedState: SceneWeatherState | null = null
let lastAppliedLocationId = ''

/**
 * 개발 환경(DEV)에서 씬 초기화 및 타일 안정화 레이턴시를 기록합니다.
 *
 * @param event 성능 측정 이벤트명
 * @param valueMs 성능 마크 기록 타임스탬프 (ms)
 */
function reportPerformanceInDevelopment(
  event: 'viewer-ready' | 'tiles-stable' | 'initial-view-ready' | 'quality-applied',
  valueMs: number,
) {
  void import('@/shared/lib/performanceTelemetry').then(({ reportDevelopmentPerformance }) => {
    reportDevelopmentPerformance({ event, valueMs })
  })
}

/**
 * 브라우저 표준 performance.mark API를 사용하여 프로파일링 포인트를 남깁니다.
 *
 * @param name 브라우저 성능 마크 고유 이름
 */
function markPerformance(name: string) {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    performance.mark(name)
  }

  if (import.meta.env.DEV) {
    const event =
      name === 'route-of-sky:viewer-ready'
        ? 'viewer-ready'
        : name === 'route-of-sky:tiles-stable'
          ? 'tiles-stable'
          : name === 'route-of-sky:initial-view-ready'
            ? 'initial-view-ready'
            : name.startsWith('route-of-sky:quality-applied-')
              ? 'quality-applied'
              : null
    if (event) {
      reportPerformanceInDevelopment(event, performance.now())
    }
  }
}

// 가비지 컬렉션(GC) 방지용 불변 Scratch 메모리 버퍼들
const sunPositionScratch = new Cartesian3()
const sunWindowScratch = new Cartesian2()
const sunToCameraScratch = new Cartesian3()
const locationSurfaceScratch = new Cartesian3()
const surfaceNormalScratch = new Cartesian3()
const sunToLocationScratch = new Cartesian3()

/**
 * 개별 Vue Props를 라이브러리 모듈들이 공통으로 소비하는 정규화된 기상 데이터 구조체로 변환합니다.
 * 하위 물리/렌더링 라이브러리는 Vue의 반응형 시스템에 결합되지 않고 순수 값 객체만 참조합니다.
 */
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

/** 절차적 절단 구름 메쉬 및 체적 밀도 조절 컨트롤러 */
const cloudController = new CloudController(
  () => viewer,
  () => sceneState.value,
  () => props.location,
)

/** 안개, 대기 소광, 비네팅 등 WebGL 후처리 셰이더 컨트롤러 */
const weatherPostProcessController = new WeatherPostProcessController(
  () => viewer,
  () => sceneState.value,
)

/** 뷰포트 최상단 2D HTML Canvas 강수(비/눈/번개) 렌더러 */
const screenWeatherRenderer = new ScreenWeatherRenderer(precipitationCanvas, () => sceneState.value)
/** GSAP 기반 카메라 쿼터니언 스무스 비행(FlyTo) 제어기 */
const cameraController = new CameraFlyToController(() => viewer)
/** 프레임 타임 P95 지연율을 감시하여 해상도 및 씬 퀄리티를 자동 보정하는 컨트롤러 */
const adaptiveQualityController = new AdaptiveSceneQualityController({
  getLevel: () => effectiveQuality.value,
  getMode: () => props.qualityMode,
  onLevelChange: (level, frameP95Ms) => {
    effectiveQuality.value = level
    markPerformance(`route-of-sky:quality-${level}:p95-${frameP95Ms.toFixed(1)}`)
  },
})

// CSS 오버레이 스타일 계산 (대기 산란 색상 필터 및 모달 효과)
const atmosphereOverlayStyle = computed(() => getAtmosphereOverlayStyle(sceneState.value))
const mistOverlayStyle = computed(() => getMistOverlayStyle(sceneState.value))
const whiteoutOverlayStyle = computed(() => getWhiteoutOverlayStyle(sceneState.value))
const skyTimeStyle = computed(() => getSkyTimeStyle(sceneState.value))
const twilightCloudGlowStyle = computed(() => getTwilightCloudGlowStyle(sceneState.value))

/**
 * 매 프레임 Cesium의 WebGL 씬 렌더링 직후(postRender) 호출되어 태양의 스크린 위치를 추적합니다.
 */
function updateSunGlowPosition(): void {
  if (!viewer || viewer.isDestroyed() || !sunGlowRef.value) return

  const el = sunGlowRef.value
  const sky = getSkyPhase(sceneState.value.time)
  const sunPosition = getSunPositionForTime(viewer.clock.currentTime, sunPositionScratch)

  // 관측 로케이션 기준 지평면 법선 벡터 추출
  const locationSurface = Cartesian3.fromDegrees(
    props.location.lng,
    props.location.lat,
    0,
    undefined,
    locationSurfaceScratch,
  )
  const surfaceNormal = Cartesian3.normalize(locationSurface, surfaceNormalScratch)
  const sunToLocation = Cartesian3.subtract(sunPosition, locationSurface, sunToLocationScratch)

  // 지평선 차폐 판정: 내적(dot product)이 0 이하이면 지평선 아래로 진 상태이므로 숨김
  const isAboveLocalHorizon = Cartesian3.dot(surfaceNormal, sunToLocation) > 0
  if (!isAboveLocalHorizon) {
    el.style.opacity = '0'
    return
  }

  // 카메라 프러스텀 전방 판정: 카메라 시선 방향과 태양 방향의 내적이 양수여야 렌더링
  const toSun = Cartesian3.subtract(sunPosition, viewer.camera.positionWC, sunToCameraScratch)
  const isInFrontOfCamera = Cartesian3.dot(toSun, viewer.camera.directionWC) > 0

  // 3D 월드 좌표 -> 2D 윈도우 스크린 픽셀 좌표 사영(Projection)
  const windowPosition = isInFrontOfCamera
    ? SceneTransforms.worldToWindowCoordinates(viewer.scene, sunPosition, sunWindowScratch)
    : undefined

  if (!windowPosition) {
    el.style.opacity = '0'
    return
  }

  const horizonBoost = CesiumMath.lerp(0.64, 1.0, sky.horizonGlow)
  const opacity = sky.daylight * horizonBoost

  // GPU 가속 변환 적용: 정수 픽셀 스냅으로 서브픽셀 래스터 블러 방지
  el.style.opacity = `${opacity}`
  el.style.transform = `translate3d(${Math.round(windowPosition.x)}px, ${Math.round(windowPosition.y)}px, 0) translate(-50%, -50%)`
}

/**
 * 이전 적용 상태와 비교하여 특정 기상 파라미터 군이 실제로 변경되었는지 검사,
 * 불필요한 Cesium 내부 상태 재계산을 필터링합니다.
 */
function hasStateChanged(
  current: SceneWeatherState,
  previous: SceneWeatherState | null,
  keys: Array<keyof SceneWeatherState>,
) {
  return !previous || keys.some((key) => current[key] !== previous[key])
}

/** 퀄리티 프로필 변경 시 각 컨트롤러의 LOD, 파티클 배수, 뷰어 해상도 스케일을 동기화합니다. */
function applyQualityProfile() {
  const profile = SCENE_QUALITY_PROFILES[effectiveQuality.value]
  screenWeatherRenderer.setQuality(profile)
  cloudController.setQuality(profile)
  weatherPostProcessController.setQuality(profile)
  emit('update:effectiveQuality', profile.level)

  if (!viewer || viewer.isDestroyed()) return

  // DPR 및 프로필에 따른 뷰포트 렌더 버퍼 해상도 스케일 재조정
  viewer.resolutionScale = profile.resolutionScale
  cloudController.update()
  weatherPostProcessController.update()
  viewer.scene.requestRender()
  markPerformance(`route-of-sky:quality-applied-${profile.level}`)
}

/**
 * 최신 기상 상태(시간, 대기질, 시정, 강수)를 실제 Cesium 씬 파이프라인에 반영합니다.
 * requestRenderMode 환경이므로 파라미터가 갱신될 때만 선택적으로 컴포넌트 렌더를 요청합니다.
 */
function applySceneState() {
  const currentState = sceneState.value
  const locationChanged = lastAppliedLocationId !== props.location.id

  // 강수 On/Off 상태의 교차가 일어날 때만 2D 캔버스 렌더러 루프 토글 (rAF 중복 경합 차단)
  const prevActive = lastAppliedState ? lastAppliedState.precipitation > 0 : false
  const currentActive = currentState.precipitation > 0
  if (prevActive !== currentActive) {
    screenWeatherRenderer.update()
  }

  /* v8 ignore next -- Vue lifecycle 밖에서 호출될 때를 위한 방어 guard입니다. */
  if (!viewer) return

  // 시각 또는 관측 위치 변경 시: 태양 궤도 시뮬레이션 및 일조 시간 동기화
  if (locationChanged || hasStateChanged(currentState, lastAppliedState, ['time'])) {
    applySceneTime(viewer, currentState, props.location)
    updateSunGlowPosition()
  }

  // 대기질, 안개, 시정 거리 변경 시: 스카이박스 색상, 대기 산란 계수 갱신
  if (
    locationChanged ||
    hasStateChanged(currentState, lastAppliedState, [
      'time',
      'precipitation',
      'aqi',
      'visibility',
      'temperature',
      'windSpeed',
      'humidity',
    ])
  ) {
    applyAtmosphereToScene(viewer, currentState)
  }

  // 운량 또는 바람 변경 시: 절차적 구름 메쉬 밀도 갱신
  if (
    locationChanged ||
    hasStateChanged(currentState, lastAppliedState, ['time', 'cloudCover', 'precipitation', 'aqi'])
  ) {
    cloudController.update()
  }

  // 강수 및 기온 변경 시: 빗물 포스트 프로세싱 셰이더 업데이트
  if (hasStateChanged(currentState, lastAppliedState, ['precipitation', 'temperature'])) {
    weatherPostProcessController.update()
  }

  // 다음 비교를 위한 스냅샷 저장
  lastAppliedState = { ...currentState }
  lastAppliedLocationId = props.location.id
}

/**
 * Props 및 슬라이더 입력이 폭주할 때 매 이벤트마다 씬을 갱신하지 않고,
 * 브라우저 렌더 틱(rAF)당 단 1회만 일괄 배치(Batch) 실행하도록 스케줄링합니다.
 */
function scheduleSceneStateUpdate() {
  if (sceneUpdateFrame) return

  if (typeof requestAnimationFrame === 'undefined') {
    applySceneState()
    return
  }

  sceneUpdateFrame = requestAnimationFrame(() => {
    sceneUpdateFrame = 0
    applySceneState()
  })
}

/**
 * Cesium 3D Viewer를 템플릿 DOM에 바인딩하고 기본 씬 설정을 구성합니다.
 */
function initializeViewer() {
  /* v8 ignore next -- 템플릿 ref가 비어 있는 비정상 마운트 방어 guard입니다. */
  if (!cesiumContainer.value) return

  if (hasCesiumIonAccessToken) {
    Ion.defaultAccessToken = cesiumIonAccessToken
  }

  // 불필요한 기본 UI 위젯을 제거하고 순수 렌더 뷰포트만 생성
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
    requestRenderMode: true,
    maximumRenderTimeChange: Number.POSITIVE_INFINITY,
  })

  configureViewerScene(viewer)
  setInitialLocationView(viewer, props.location)

  // WebGL 렌더링 프레임 직후 태양 위치를 사영하는 리스너 등록
  removeSunGlowUpdater = viewer.scene.postRender.addEventListener(updateSunGlowPosition)

  applyQualityProfile()
  applySceneState()
  markPerformance('route-of-sky:viewer-ready')

  if (hasCesiumIonAccessToken) {
    void loadGooglePhotorealisticTiles()
  } else {
    statusMessage.value = 'Cesium ion token required for Google 3D Tiles'
  }
}

/** Google Photorealistic 3D Tiles(Asset ID: 2275207)를 로드하고 점진적 LOD 스트리밍을 구성합니다. */
async function loadGooglePhotorealisticTiles() {
  /* v8 ignore next -- private async 진입점의 viewer 소실 방어 guard입니다. */
  if (!viewer) return

  stopTilesetRenderSync?.()
  stopTilesetRenderSync = null
  isTilesLoading.value = true
  statusMessage.value = 'Loading Google Photorealistic 3D Tiles'

  try {
    const tileset = await Cesium3DTileset.fromIonAssetId(GOOGLE_3D_TILES_ION_ASSET_ID, {
      // 부모 타일을 먼저 빠르게 띄우고(16), 포커스된 시야의 자식 LOD를 점진적으로 정밀화
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
    setInitialLocationView(viewer, props.location)

    // 초기 타일셋이 안정화될 때까지 렌더 루프를 동기화
    stopTilesetRenderSync = keepRenderingUntilInitialTilesLoaded(viewer, tileset, () => {
      if (destroyed) return

      isTilesLoading.value = false
      statusMessage.value = ''
    })
  } catch (error) {
    console.error('[CesiumScene] Google 3D Tiles 로드 실패:', error)
    statusMessage.value = 'Unable to load Google 3D Tiles asset'
    isTilesLoading.value = false

    // 타일셋 로드 실패 시 검은 화면 방지를 위해 기본 지구본 지형을 복구
    if (viewer && !viewer.isDestroyed()) {
      viewer.scene.globe.show = true
      viewer.scene.requestRender()
    }
  }
}

/**
 * 타일셋 마운트 직후 초기 시야의 LOD 타일들이 준비될 때까지 requestRender를 주기적으로 발생시켜
 * 씬이 멈추지 않고 선명한 상태까지 자연스럽게 정착하도록 보장합니다.
 *
 * @param activeViewer 현재 활성화된 Cesium 뷰어
 * @param tileset 초기화 중인 3D 타일셋
 * @param onInitialTilesLoaded 초기 렌더링 안정화 시 호출될 콜백
 */
function keepRenderingUntilInitialTilesLoaded(
  activeViewer: Viewer,
  tileset: Cesium3DTileset,
  onInitialTilesLoaded: () => void,
) {
  // 내부 상태 추적 및 타이머 핸들
  let timeoutId = 0
  let idleTimeoutId = 0
  let stopped = false
  let initialTilesSettled = false
  let initialViewReady = false
  const removeListeners: Array<() => void> = []

  const requestRender = () => {
    if (destroyed || activeViewer.isDestroyed()) return

    activeViewer.scene.requestRender()
  }

  const stop = () => {
    if (stopped) return
    stopped = true

    // 지연 실행 중인 비동기 타이머 클리어
    if (timeoutId) window.clearTimeout(timeoutId)
    if (idleTimeoutId) window.clearTimeout(idleTimeoutId)

    for (const removeListener of removeListeners) {
      removeListener()
    }
    /* v8 ignore next -- 이전 tileset stop 함수가 뒤늦게 호출될 때의 stale guard입니다. */
    if (stopTilesetRenderSync === stop) {
      stopTilesetRenderSync = null
    }
  }

  /** 초기 기본 형태가 렌더된 후 디테일 수준(SSE)을 본래 목표치(8)로 정밀화 */
  const settleInitialTiles = () => {
    if (initialTilesSettled) return

    initialTilesSettled = true
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeoutId = 0
    }

    // 초기 형태가 잡혔으므로 SSE 기준을 엄격하게 조정하여 정밀 디테일 타일 스트리밍 시작
    tileset.maximumScreenSpaceError = 8
    onInitialTilesLoaded()
    markPerformance('route-of-sky:tiles-stable')
    requestRender()
  }

  /** 카메라 시야 내 타일들이 100% 안착했을 때 동기화 루프를 완전히 종료 */
  const finishInitialViewLoad = () => {
    if (initialViewReady) return

    initialViewReady = true
    requestRender()
    settleInitialTiles()
    markPerformance('route-of-sky:initial-view-ready')
    stop()
  }

  /** 타일 다운로드 및 GPU 파싱 큐가 500ms 동안 유휴 상태를 유지하면 렌더 정착으로 판정 */
  const scheduleInitialViewReady = () => {
    if (!initialTilesSettled || initialViewReady || idleTimeoutId) return

    idleTimeoutId = window.setTimeout(() => {
      idleTimeoutId = 0
      finishInitialViewLoad()
    }, INITIAL_VIEW_IDLE_WINDOW_MS)
  }

  /** Cesium의 내부 타일 네트워크 요청 및 GPU 처리 큐의 변동을 실시간으로 감시합니다. */
  const handleLoadProgress = (pendingRequests = 0, tilesProcessing = 0) => {
    requestRender()
    if (!initialTilesSettled || initialViewReady) return

    if (pendingRequests > 0 || tilesProcessing > 0) {
      if (idleTimeoutId) {
        window.clearTimeout(idleTimeoutId)
        idleTimeoutId = 0
      }
      return
    }

    scheduleInitialViewReady()
  }

  // 개별 타일 청크가 1개라도 디코딩/업로드될 때마다 씬을 갱신하고 안정화 큐를 점검
  removeListeners.push(
    tileset.tileLoad.addEventListener(() => {
      requestRender()
      settleInitialTiles()
      scheduleInitialViewReady()
    }),
  )
  // 타일 처리 큐의 증감을 감시하여 다운로드 진행 상태 추적
  removeListeners.push(tileset.loadProgress.addEventListener(handleLoadProgress))
  // Cesium 엔진이 판단하는 초기/전체 타일 완료 이벤트 리스너 (조기 수렴 시 즉시 종료)
  removeListeners.push(tileset.initialTilesLoaded.addEventListener(finishInitialViewLoad))
  removeListeners.push(tileset.allTilesLoaded.addEventListener(finishInitialViewLoad))

  requestRender()

  // 네트워크 지연으로 타일 로드가 영구 지연되는 것을 막기 위한 세이프가드 타이머
  timeoutId = window.setTimeout(() => {
    settleInitialTiles()
    scheduleInitialViewReady()
  }, TILESET_WARMUP_TIMEOUT_MS)

  return stop
}

/** 지정된 지리적 웨이포인트로 카메라 비행을 실행합니다. */
function flyToLocation(target: CameraWaypoint) {
  cameraController.flyToLocation(target, {
    onStart: () => emit('cameraFlightStart'),
    onFinish: () => emit('cameraFlightEnd'),
  })
}

// 모든 기상 슬라이더 및 파라미터 변화를 단일 묶음으로 감시하여 일괄 배치 갱신
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
  scheduleSceneStateUpdate,
)

// 품질 레벨 변경 즉시 프로필 적용
watch(effectiveQuality, applyQualityProfile, { immediate: true })

// 품질 모드(auto <-> 고정) 변경 감시
watch(
  () => props.qualityMode,
  (mode) => {
    effectiveQuality.value = mode === 'auto' ? getRecommendedAutoQuality() : mode

    if (!mounted) return
    if (mode === 'auto') {
      adaptiveQualityController.start()
    } else {
      adaptiveQualityController.stop()
    }
  },
  { immediate: true },
)

onMounted(async () => {
  mounted = true
  await nextTick()
  screenWeatherRenderer.update()
  initializeViewer()
  if (props.qualityMode === 'auto') {
    adaptiveQualityController.start()
  }
})

onBeforeUnmount(() => {
  destroyed = true
  mounted = false

  // 모든 타이머 및 rAF 스케줄러 즉시 취소
  adaptiveQualityController.stop()
  if (sceneUpdateFrame && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(sceneUpdateFrame)
  }
  sceneUpdateFrame = 0

  // 외부 Lib 인스턴스 정리 및 GPU 리소스 클린업
  cameraController.dispose()
  stopTilesetRenderSync?.()
  stopTilesetRenderSync = null
  removeSunGlowUpdater?.()
  removeSunGlowUpdater = null
  cloudController.dispose()
  weatherPostProcessController.dispose()
  screenWeatherRenderer.stop()

  // WebGL 컨텍스트 및 Cesium Viewer 파기
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
  }

  viewer = null
})

// 부모 컴포넌트(헤더/내비게이션 등)에서 카메라 제어 메서드를 호출할 수 있도록 공개
defineExpose({
  flyToLocation,
})
</script>

<template>
  <section
    class="relative h-full w-full overflow-hidden bg-slate-950"
    :data-quality-level="effectiveQuality"
    :data-quality-mode="qualityMode"
  >
    <!-- Cesium 3D WebGL 렌더링 컨테이너 -->
    <div id="cesiumContainer" ref="cesiumContainer" class="absolute inset-0 h-full w-full" @contextmenu.prevent></div>
    <!-- 대기 조도 및 황혼/일몰 시각 블렌딩 필터 -->
    <div class="pointer-events-none absolute inset-0 mix-blend-screen" :style="skyTimeStyle"></div>
    <div class="pointer-events-none absolute inset-0 mix-blend-screen" :style="twilightCloudGlowStyle"></div>
    <!-- 뷰포트 투영 태양광 글로우 (Sun Glow) -->
    <div
      ref="sunGlowRef"
      class="pointer-events-none absolute top-0 left-0 h-24 w-24 rounded-full bg-amber-100/80 mix-blend-screen shadow-[0_0_34px_rgba(253,224,71,0.88),0_0_110px_rgba(251,146,60,0.68),0_0_190px_rgba(180,83,9,0.32)] will-change-transform"
      style="opacity: 0"
    ></div>
    <!-- 대기질(AQI) 및 안개/시정(Visibility) 오버레이 -->
    <div class="pointer-events-none absolute inset-0" :style="atmosphereOverlayStyle"></div>
    <div class="pointer-events-none absolute inset-0" :style="mistOverlayStyle"></div>
    <!-- 비, 눈, 번개 2D 오버레이 캔버스 -->
    <canvas ref="precipitationCanvas" class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
    <!-- 화이트아웃 레이어 -->
    <div class="pointer-events-none absolute inset-0" :style="whiteoutOverlayStyle"></div>
    <!-- 상태 알림 뱃지 -->
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
