import { computed, type ComputedRef } from 'vue'

/**
 * 기본 자연 씬과 Google 3D Tiles 씬에서 사용하는 카메라/컨트롤 설정을 계산합니다.
 *
 * 두 씬은 실제 스케일 차이가 커서 카메라 거리, clipping range, orbit target을
 * 같은 컴포넌트 안에서 직접 분기하면 SceneCanvas의 책임이 빠르게 커집니다.
 */
export function useSceneCamera(hasGoogleTiles: ComputedRef<boolean>) {
  const cameraPosition = computed<[number, number, number]>(() => {
    return hasGoogleTiles.value ? [900, 560, 1150] : [12, 8, 16]
  })

  const cameraNear = computed(() => {
    return hasGoogleTiles.value ? 1 : 0.1
  })

  const cameraFar = computed(() => {
    return hasGoogleTiles.value ? 60000 : 1000
  })

  const cameraFov = computed(() => {
    return hasGoogleTiles.value ? 66 : 45
  })

  const skyDomeRadius = computed(() => {
    return hasGoogleTiles.value ? 45000 : 400
  })

  const sunLightDistance = computed(() => {
    return hasGoogleTiles.value ? 12000 : 5
  })

  const maxDistance = computed(() => {
    return hasGoogleTiles.value ? 9000 : 45
  })

  const minDistance = computed(() => {
    return hasGoogleTiles.value ? 320 : 5
  })

  const minPolarAngle = computed(() => {
    return hasGoogleTiles.value ? 0.0 : Math.PI / 3
  })

  const maxPolarAngle = computed(() => {
    return hasGoogleTiles.value ? Math.PI / 2 + 0.04 : Math.PI / 2 + 0.7
  })

  const controlsTarget = computed<[number, number, number]>(() => {
    return hasGoogleTiles.value ? [0, 620, 0] : [0, 0, 0]
  })

  const screenSpacePanning = computed(() => {
    return !hasGoogleTiles.value
  })

  return {
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
  }
}
