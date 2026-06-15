import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTresContext } from '@tresjs/core'
import * as THREE from 'three'
import { TilesRenderer } from '3d-tiles-renderer'
import {
  GLTFExtensionsPlugin,
  GoogleCloudAuthPlugin,
  TileCompressionPlugin,
} from '3d-tiles-renderer/plugins'
import { googleMapsApiKey } from '@/shared/config/env'

export interface GoogleTilesOrigin {
  /** 로컬 원점에 맞출 위도입니다. */
  lat: number
  /** 로컬 원점에 맞출 경도입니다. */
  lon: number
  /** 로컬 원점에 맞출 고도입니다. 단위는 meter입니다. */
  alt: number
}

/**
 * Google Photorealistic 3D Tiles의 생성, 정렬, LOD 업데이트, 정리를 담당합니다.
 *
 * TilesRenderer는 Vue proxy와 충돌할 수 있어 composable 내부의 일반 변수로 유지하고,
 * TresJS의 camera/renderer 버전 차이는 작은 adapter 함수로 흡수합니다.
 */
export function useGoogleTilesRenderer(origin: GoogleTilesOrigin) {
  // TilesRenderer는 Vue proxy와 맞지 않는 내부 구조가 있어 일반 변수로 유지합니다.
  // Vue가 클래스 인스턴스를 관찰하려다 발생하는 Object.defineProperty 오류를 피하기 위한 선택입니다.
  let tilesRenderer: TilesRenderer | null = null
  const tilesGroup = new THREE.Group()

  // 디버깅 HUD나 상태 표시에 사용할 수 있는 진단용 reactive 상태입니다.
  const isCameraBound = ref(false)
  const isRendering = ref(false)
  const isRootLoaded = ref(false)
  const hasLoadedModel = ref(false)
  const visibleTileCount = ref(0)
  const activeTileCount = ref(0)
  const lastLoadError = ref('')

  const apiKey = computed(() => {
    return googleMapsApiKey
  })

  const { camera, renderer, scene } = useTresContext()
  let animationFrameId = 0
  let isLODConfigured = false
  const enuFrame = new THREE.Matrix4()
  const localTransform = new THREE.Matrix4()
  const gigabyte = 1024 * 1024 * 1024

  // 라이브러리 ENU 좌표계(X=동, Y=북, Z=상)를 앱의 Three.js 좌표계(X=동, Y=상, Z=남)로 변환합니다.
  const enuToThreeWorld = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1)

  function degToRad(degrees: number) {
    return (degrees * Math.PI) / 180
  }

  // 목표 지리 좌표가 로컬 원점에 오도록 지구 타일셋 그룹을 정렬합니다.
  function alignTileset() {
    if (!tilesRenderer) return

    tilesRenderer.ellipsoid.getEastNorthUpFrame(
      degToRad(origin.lat),
      degToRad(origin.lon),
      origin.alt,
      enuFrame,
    )

    // 렌더 루프에서 Three.js가 지리 좌표 변환 행렬을 덮어쓰지 않게 합니다.
    tilesRenderer.group.matrixAutoUpdate = false

    localTransform.copy(enuFrame).invert().premultiply(enuToThreeWorld)
    tilesRenderer.group.matrix.copy(localTransform)
    tilesRenderer.group.matrix.decompose(
      tilesRenderer.group.position,
      tilesRenderer.group.quaternion,
      tilesRenderer.group.scale,
    )
    tilesRenderer.group.matrixWorldNeedsUpdate = true
    tilesRenderer.group.updateMatrixWorld(true)
    console.log('[Google3DTiles] Coordinates re-aligned to lat:', origin.lat, 'lon:', origin.lon)
  }

  // Google Photorealistic 3D Tiles 렌더러를 초기화하고 로드합니다.
  function initTiles() {
    cleanupTiles()

    if (!apiKey.value) {
      return
    }

    console.log(
      '[Google3DTiles] Initializing tiles renderer with API key length:',
      apiKey.value.length,
    )

    isRootLoaded.value = false
    hasLoadedModel.value = false
    visibleTileCount.value = 0
    activeTileCount.value = 0
    lastLoadError.value = ''

    const rendererInstance = new TilesRenderer()
    rendererInstance.registerPlugin(
      new GoogleCloudAuthPlugin({
        apiToken: apiKey.value,
        autoRefreshToken: true,
      }),
    )
    rendererInstance.registerPlugin(new GLTFExtensionsPlugin({ autoDispose: false }))
    rendererInstance.registerPlugin(new TileCompressionPlugin())

    rendererInstance.errorTarget = 3
    rendererInstance.maxTilesProcessed = 1200
    rendererInstance.loadSiblings = true
    rendererInstance.loadAncestors = true
    rendererInstance.lruCache.minSize = 9000
    rendererInstance.lruCache.maxSize = 14000
    rendererInstance.lruCache.minBytesSize = 0.7 * gigabyte
    rendererInstance.lruCache.maxBytesSize = 1.1 * gigabyte

    rendererInstance.addEventListener('load-root-tileset', () => {
      isRootLoaded.value = true
      lastLoadError.value = ''
      alignTileset()
      console.log('[Google3DTiles] Root tileset loaded')
    })

    rendererInstance.addEventListener('load-model', () => {
      hasLoadedModel.value = true
      lastLoadError.value = ''
    })

    rendererInstance.addEventListener('load-error', (event) => {
      const error = event.error?.message || 'Unknown tile loading error'
      const url = typeof event.url === 'string' ? event.url : event.url?.toString()
      lastLoadError.value = url ? `${error} (${url})` : error
      console.error('[Google3DTiles] Failed to load tile:', event)
    })

    tilesRenderer = rendererInstance

    tilesGroup.add(rendererInstance.group)
    alignTileset()

    startRenderLoop()
  }

  function cleanupTiles() {
    stopRenderLoop()
    if (tilesRenderer) {
      console.log('[Google3DTiles] Disposing tiles renderer...')
      tilesGroup.remove(tilesRenderer.group)
      tilesRenderer.dispose()
      tilesRenderer = null
    }
  }

  function getActiveCamera() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cameraManager = camera as any
    return (
      cameraManager.activeCamera?.value ||
      cameraManager.activeCamera ||
      cameraManager.value ||
      camera
    )
  }

  function getWebGLRenderer() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rendererManager = renderer as any
    const candidate =
      rendererManager.instance?.value ||
      rendererManager.instance ||
      rendererManager.value ||
      rendererManager

    return typeof candidate?.getSize === 'function' ? candidate : null
  }

  // TresJS 버전 차이에 덜 의존하도록 독립적인 requestAnimationFrame 루프에서 LOD를 갱신합니다.
  function startRenderLoop() {
    stopRenderLoop()

    const tick = () => {
      if (!tilesRenderer) return

      const activeCamera = getActiveCamera()
      const webglRenderer = getWebGLRenderer()

      if (activeCamera && webglRenderer) {
        isCameraBound.value = true

        if (!isLODConfigured) {
          tilesRenderer.setCamera(activeCamera)
          tilesRenderer.setResolutionFromRenderer(activeCamera, webglRenderer)
          isLODConfigured = true
          console.log('[Google3DTiles] Camera and Renderer bound to LOD calculations')
        }

        activeCamera.updateMatrixWorld()
        tilesRenderer.setCamera(activeCamera)
        tilesRenderer.setResolutionFromRenderer(activeCamera, webglRenderer)
        tilesRenderer.update()
        visibleTileCount.value = tilesRenderer.visibleTiles.size
        activeTileCount.value = tilesRenderer.activeTiles.size
        isRendering.value = true
      } else {
        isCameraBound.value = false
        isRendering.value = false
      }

      animationFrameId = requestAnimationFrame(tick)
    }

    tick()
  }

  function stopRenderLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = 0
    }
    isLODConfigured = false
    isCameraBound.value = false
    isRendering.value = false
    visibleTileCount.value = 0
    activeTileCount.value = 0
  }

  // 위치 좌표가 바뀌면 타일셋을 다시 정렬합니다.
  watch([() => origin.lat, () => origin.lon, () => origin.alt], () => {
    alignTileset()
  })

  // API 키가 바뀌면 인증 정보를 반영하기 위해 타일셋을 다시 로드합니다.
  watch(apiKey, () => {
    initTiles()
  })

  onMounted(() => {
    scene.value.add(tilesGroup)
    initTiles()
  })

  onUnmounted(() => {
    cleanupTiles()
    scene.value.remove(tilesGroup)
  })

  return {
    isCameraBound,
    isRendering,
    isRootLoaded,
    hasLoadedModel,
    visibleTileCount,
    activeTileCount,
    lastLoadError,
  }
}
