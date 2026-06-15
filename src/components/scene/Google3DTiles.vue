<script setup lang="ts">
import { onMounted, onUnmounted, watch, computed, ref } from 'vue'
import { useTresContext } from '@tresjs/core'
import * as THREE from 'three'
import { TilesRenderer } from '3d-tiles-renderer'
import {
  GLTFExtensionsPlugin,
  GoogleCloudAuthPlugin,
  TileCompressionPlugin,
} from '3d-tiles-renderer/plugins'

// Props allowing users to configure which location in the world to anchor at (0, 0, 0)
const props = withDefaults(
  defineProps<{
    lat?: number // Latitude of the local origin
    lon?: number // Longitude of the local origin
    alt?: number // Altitude of the local origin (meters)
  }>(),
  {
    lat: 37.512218, // Default: Lotte World Tower, Jamsil, Seoul
    lon: 127.102707,
    alt: 25,
  },
)

// CRITICAL: We use a plain JS variable instead of Vue shallowRef to bypass Vue 3's proxy system.
// This prevents "Object.defineProperty called on non-object" errors caused by Vue trying to observe the TilesRenderer class.
let tilesRenderer: TilesRenderer | null = null
const tilesGroup = new THREE.Group()

// Diagnostic reactive states to render in our HUD overlay
const isCameraBound = ref(false)
const isRendering = ref(false)
const isRootLoaded = ref(false)
const hasLoadedModel = ref(false)
const visibleTileCount = ref(0)
const activeTileCount = ref(0)
const lastLoadError = ref('')

// Load Google Maps API Key from Vite env variables
const apiKey = computed(() => {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
})

const { camera, renderer, scene } = useTresContext()
let animationFrameId = 0
let isLODConfigured = false
const enuFrame = new THREE.Matrix4()
const localTransform = new THREE.Matrix4()
const gigabyte = 1024 * 1024 * 1024

// Convert library ENU coordinates (X east, Y north, Z up) into this app's
// Three.js convention (X east, Y up, Z south).
const enuToThreeWorld = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1)

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180
}

// Align the global Earth tileset group so the target coordinates sit at local origin.
function alignTileset() {
  if (!tilesRenderer) return

  tilesRenderer.ellipsoid.getEastNorthUpFrame(
    degToRad(props.lat),
    degToRad(props.lon),
    props.alt,
    enuFrame,
  )

  // Prevent Three.js from resetting our custom geospatial transform in the render loop.
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
  console.log('[Google3DTiles] Coordinates re-aligned to lat:', props.lat, 'lon:', props.lon)
}

// 4. Initialize and Load Google Photorealistic 3D Tiles
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
    cameraManager.activeCamera?.value || cameraManager.activeCamera || cameraManager.value || camera
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

// 5. Standard requestAnimationFrame Render Loop (Unbound to TresJS version variations)
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

// Reactively re-align if location coordinates change
watch([() => props.lat, () => props.lon, () => props.alt], () => {
  alignTileset()
})

// Reactively reload tileset if API Key changes
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
</script>
