import { computed, type ComputedRef } from 'vue'
import type { SceneWeatherProps, TimeFactors } from '../types'

interface SceneVector3 {
  x: number
  y: number
  z: number
}

function normalizeVector(vector: SceneVector3): SceneVector3 {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  }
}

/**
 * 시간과 렌더링 모드에 맞춰 태양 방향, 실제 조명 위치, 시간대 혼합 계수를 계산합니다.
 *
 * Google 3D Tiles 모드는 지리 좌표계에 맞춘 동/남/서 방향의 태양 경로를 사용하고,
 * 기본 자연 씬은 연출용 24시간 원형 궤도를 사용합니다.
 */
export function useSunPosition(
  props: SceneWeatherProps,
  hasCesiumTiles: ComputedRef<boolean>,
  sunLightDistance: ComputedRef<number>,
) {
  const theta = computed(() => {
    return ((props.time - 6.0) / 24.0) * Math.PI * 2
  })

  // Google 타일은 X=동쪽, Y=위, Z=남쪽으로 보이도록 변환되어 있어 그 축에 맞춰 태양을 배치합니다.
  const mapTileSunPosition = computed(() => {
    const dayAngle = ((props.time - 6.0) / 12.0) * Math.PI
    const eastWest = Math.cos(dayAngle)
    const altitude = Math.sin(dayAngle)
    const southernArc = Math.max(0, altitude) * 0.62

    return normalizeVector({ x: eastWest, y: altitude * 0.86, z: southernArc })
  })

  const sunPosition = computed(() => {
    if (hasCesiumTiles.value) {
      return mapTileSunPosition.value
    }

    const t = theta.value
    const azimuth = Math.PI / 4
    const x = Math.cos(t) * Math.cos(azimuth)
    const y = Math.sin(t)
    const z = Math.cos(t) * Math.sin(azimuth)
    return normalizeVector({ x, y, z })
  })

  const sunDirectionArray = computed<[number, number, number]>(() => {
    const distance = sunLightDistance.value

    // 밤에는 태양의 반대 방향을 달빛처럼 사용해 어두운 시간대에도 형태가 읽히게 합니다.
    if (sunPosition.value.y < 0) {
      return [
        sunPosition.value.x * -distance,
        sunPosition.value.y * -distance,
        sunPosition.value.z * -distance,
      ]
    }

    return [
      sunPosition.value.x * distance,
      sunPosition.value.y * distance,
      sunPosition.value.z * distance,
    ]
  })

  const timeFactors = computed<TimeFactors>(() => {
    const sunAlt = sunPosition.value.y
    // 일출/일몰이 너무 짧게 지나가지 않도록 -0.15~0.35 구간을 완만하게 섞습니다.
    const dayFactor = Math.max(0, Math.min(1, (sunAlt + 0.15) / 0.5))
    const nightFactor = Math.max(0, Math.min(1, (-sunAlt + 0.15) / 0.5))
    const sunsetFactor = 1.0 - dayFactor - nightFactor

    return { dayFactor, nightFactor, sunsetFactor }
  })

  return {
    sunPosition,
    sunDirectionArray,
    timeFactors,
  }
}
