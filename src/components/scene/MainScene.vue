<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Vector3, BackSide, Clock } from 'three'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { hasGoogleMapsApiKey } from '@/shared/config/env'
import { useAtmosphere } from '@/features/scene/composables/useAtmosphere'
import { useSceneCamera } from '@/features/scene/composables/useSceneCamera'
import { useSunPosition } from '@/features/scene/composables/useSunPosition'
import { skyFragmentShader, skyVertexShader } from '@/features/scene/shaders/skyShader'
import SkyElements from './SkyElements.vue'
import Terrain from './Terrain.vue'
import Google3DTiles from './Google3DTiles.vue'

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

const hasGoogleTiles = computed(() => hasGoogleMapsApiKey)

const {
  cameraPosition,
  cameraNear,
  cameraFar,
  cameraFov,
  skyDomeRadius,
  sunLightDistance,
  maxDistance,
  minDistance,
  minPolarAngle,
  maxPolarAngle,
  controlsTarget,
  screenSpacePanning,
} = useSceneCamera(hasGoogleTiles)

const { sunPosition, sunDirectionArray, timeFactors } = useSunPosition(
  props,
  hasGoogleTiles,
  sunLightDistance,
)

const {
  ambientColor,
  ambientIntensity,
  directionalColor,
  directionalIntensity,
  fogColor,
  fogDensity,
} = useAtmosphere(props, timeFactors)

type OrbitControlsLike = {
  target?: Vector3
  object?: {
    position?: Vector3
  }
  update?: () => void
}

type OrbitControlsComponentRef = {
  instance?: { value?: OrbitControlsLike | null } | OrbitControlsLike | null
}

const orbitControlsRef = ref<OrbitControlsComponentRef | null>(null)
const minMapTargetY = 620
const minMapCameraY = 260

function getOrbitControlsFromRef(): OrbitControlsLike | null {
  const instance = orbitControlsRef.value?.instance

  if (!instance) return null
  if ('value' in instance) return (instance.value as OrbitControlsLike | null) || null

  return instance as OrbitControlsLike
}

function resolveOrbitControls(input?: unknown): OrbitControlsLike | null {
  if (!input || typeof input !== 'object') return getOrbitControlsFromRef()

  const candidate = input as OrbitControlsLike
  if (typeof candidate.update === 'function') return candidate

  const eventTarget = (input as { target?: unknown }).target
  if (eventTarget && typeof eventTarget === 'object') {
    const targetCandidate = eventTarget as OrbitControlsLike
    if (typeof targetCandidate.update === 'function') return targetCandidate
  }

  return getOrbitControlsFromRef()
}

function clampMapCamera(input?: unknown) {
  const controls = resolveOrbitControls(input)
  if (!hasGoogleTiles.value || !controls) return

  let changed = false

  if (controls.target && controls.target.y < minMapTargetY) {
    controls.target.y = minMapTargetY
    changed = true
  }

  const cameraPosition = controls.object?.position
  if (cameraPosition && cameraPosition.y < minMapCameraY) {
    cameraPosition.y = minMapCameraY
    changed = true
  }

  if (changed) {
    controls.update?.()
  }
}

// 절차적으로 생성하는 하늘 돔 셰이더의 uniform입니다.
const uniforms = {
  uSunPosition: { value: new Vector3() },
  uTime: { value: 0 },
  uCloudCover: { value: 0.65 },
  uPrecipitation: { value: 0.0 },
}

// props와 태양 위치 변화가 셰이더 uniform에 즉시 반영되도록 동기화합니다.
watch(
  () => sunPosition.value,
  (newVal) => {
    uniforms.uSunPosition.value.copy(newVal)
  },
  { immediate: true },
)

watch(
  () => props.cloudCover,
  (newVal) => {
    uniforms.uCloudCover.value = newVal / 100
  },
  { immediate: true },
)

watch(
  () => props.precipitation,
  (newVal) => {
    uniforms.uPrecipitation.value = newVal / 100
  },
  { immediate: true },
)

// 구름 이동과 별 반짝임 애니메이션에 사용할 시간 uniform을 매 프레임 갱신합니다.
const clock = new Clock()
const onBeforeRender = () => {
  clampMapCamera()
  uniforms.uTime.value = clock.getElapsedTime()
}
</script>

<template>
  <!-- TresCanvas setup with background fog matches horizon color -->
  <TresCanvas clear-color="#000000" window-size shadows>
    <TresPerspectiveCamera
      :position="cameraPosition"
      :look-at="controlsTarget"
      :near="cameraNear"
      :far="cameraFar"
      :fov="cameraFov"
    />
    <OrbitControls
      ref="orbitControlsRef"
      :target="controlsTarget"
      :maxDistance="maxDistance"
      :minDistance="minDistance"
      :minPolarAngle="minPolarAngle"
      :maxPolarAngle="maxPolarAngle"
      :screenSpacePanning="screenSpacePanning"
      @start="clampMapCamera"
      @change="clampMapCamera"
      @end="clampMapCamera"
    />

    <!-- Dynamic Environment Lights -->
    <TresAmbientLight :color="ambientColor" :intensity="ambientIntensity" />
    <TresDirectionalLight
      :position="sunDirectionArray"
      :color="directionalColor"
      :intensity="directionalIntensity"
      cast-shadow
    />

    <!-- Dynamic Fog System -->
    <TresFogExp2 :color="fogColor" :density="fogDensity" />

    <!-- Procedural Sky Dome Mesh -->
    <TresMesh :render-order="-1000" @before-render="onBeforeRender">
      <TresSphereGeometry :args="[skyDomeRadius, 96, 48]" />
      <TresShaderMaterial
        :vertex-shader="skyVertexShader"
        :fragment-shader="skyFragmentShader"
        :uniforms="uniforms"
        :side="BackSide"
        :depth-write="false"
        :fog="false"
      />
    </TresMesh>

    <!-- Google Photorealistic 3D Tiles (Activated when API Key is present) -->
    <Google3DTiles v-if="hasGoogleTiles" />

    <!-- Default Fantasy Nature Scene (Activated when API Key is missing) -->
    <template v-else>
      <!-- Base geometry placeholder (rotating box mesh) -->
      <SkyElements />

      <!-- Terrain containing mountains, hills and valleys -->
      <Terrain :precipitation="props.precipitation" />
    </template>
  </TresCanvas>
</template>
