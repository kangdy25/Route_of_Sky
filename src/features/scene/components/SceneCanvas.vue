<script setup lang="ts">
import { computed, watch } from 'vue'
import { Vector3, BackSide, Clock } from 'three'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { hasGoogleMapsApiKey } from '@/shared/config/env'
import { useAtmosphere } from '@/features/scene/composables/useAtmosphere'
import { useOrbitCameraClamp } from '@/features/scene/composables/useOrbitCameraClamp'
import { useSceneCamera } from '@/features/scene/composables/useSceneCamera'
import { useSunPosition } from '@/features/scene/composables/useSunPosition'
import { skyFragmentShader, skyVertexShader } from '@/features/scene/shaders/skyShader'
import DefaultNatureScene from './DefaultNatureScene.vue'
import GoogleTilesScene from './GoogleTilesScene.vue'

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

const { bindOrbitControlsRef, clampMapCamera } = useOrbitCameraClamp(hasGoogleTiles)

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
  <!-- 씬의 전체 3D 렌더링 컨텍스트입니다. -->
  <TresCanvas clear-color="#000000" window-size shadows>
    <TresPerspectiveCamera
      :position="cameraPosition"
      :look-at="controlsTarget"
      :near="cameraNear"
      :far="cameraFar"
      :fov="cameraFov"
    />
    <OrbitControls
      :ref="bindOrbitControlsRef"
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

    <!-- 시간대와 날씨에 반응하는 환경 조명입니다. -->
    <TresAmbientLight :color="ambientColor" :intensity="ambientIntensity" />
    <TresDirectionalLight
      :position="sunDirectionArray"
      :color="directionalColor"
      :intensity="directionalIntensity"
      cast-shadow
    />

    <!-- 가시거리와 AQI를 반영하는 안개입니다. -->
    <TresFogExp2 :color="fogColor" :density="fogDensity" />

    <!-- 절차적으로 그리는 하늘 돔입니다. -->
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

    <!-- API 키가 있으면 Google Photorealistic 3D Tiles를 렌더링합니다. -->
    <GoogleTilesScene v-if="hasGoogleTiles" />

    <!-- API 키가 없을 때 사용하는 기본 씬입니다. -->
    <DefaultNatureScene v-else :precipitation="props.precipitation" />
  </TresCanvas>
</template>
