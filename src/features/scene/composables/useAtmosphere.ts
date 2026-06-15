import { computed, type ComputedRef } from 'vue'
import { Color } from 'three'
import type { SceneWeatherProps, TimeFactors } from '../types'

/**
 * 시간대와 날씨 입력값을 기반으로 씬의 대기색, 조명 세기, 안개 밀도를 계산합니다.
 *
 * 반환값은 TresJS 템플릿 바인딩에서 바로 사용할 수 있도록 computed 값으로 유지합니다.
 */
export function useAtmosphere(props: SceneWeatherProps, timeFactors: ComputedRef<TimeFactors>) {
  const ambientColor = computed(() => {
    const { dayFactor, nightFactor, sunsetFactor } = timeFactors.value

    const r = 0.5 * dayFactor + 0.75 * sunsetFactor + 0.05 * nightFactor
    const g = 0.6 * dayFactor + 0.45 * sunsetFactor + 0.08 * nightFactor
    const b = 0.75 * dayFactor + 0.3 * sunsetFactor + 0.15 * nightFactor

    const precFactor = props.precipitation / 100
    const stormR = 0.22
    const stormG = 0.24
    const stormB = 0.28

    return new Color(
      r * (1 - precFactor) + stormR * precFactor,
      g * (1 - precFactor) + stormG * precFactor,
      b * (1 - precFactor) + stormB * precFactor,
    )
  })

  const ambientIntensity = computed(() => {
    const { dayFactor, nightFactor, sunsetFactor } = timeFactors.value
    let baseIntensity = 0.65 * dayFactor + 0.45 * sunsetFactor + 0.18 * nightFactor

    const precFactor = props.precipitation / 100
    baseIntensity *= 1.0 - precFactor * 0.35

    return baseIntensity
  })

  const directionalColor = computed(() => {
    const { dayFactor, nightFactor, sunsetFactor } = timeFactors.value

    const r = 1.0 * dayFactor + 1.0 * sunsetFactor + 0.65 * nightFactor
    const g = 0.95 * dayFactor + 0.55 * sunsetFactor + 0.72 * nightFactor
    const b = 0.85 * dayFactor + 0.25 * sunsetFactor + 0.85 * nightFactor

    return new Color(r, g, b)
  })

  const directionalIntensity = computed(() => {
    const { dayFactor, nightFactor, sunsetFactor } = timeFactors.value
    let baseIntensity = 1.3 * dayFactor + 0.85 * sunsetFactor + 0.18 * nightFactor

    const precFactor = props.precipitation / 100
    baseIntensity *= 1.0 - precFactor * 0.88

    return baseIntensity
  })

  const fogColor = computed(() => {
    const { dayFactor, nightFactor, sunsetFactor } = timeFactors.value

    const r = 140 * dayFactor + 224 * sunsetFactor + 10 * nightFactor
    const g = 185 * dayFactor + 115 * sunsetFactor + 13 * nightFactor
    const b = 235 * dayFactor + 65 * sunsetFactor + 28 * nightFactor

    const precFactor = props.precipitation / 100
    const stormFog = [74, 85, 104]

    const finalR = (r * (1 - precFactor) + stormFog[0] * precFactor) / 255
    const finalG = (g * (1 - precFactor) + stormFog[1] * precFactor) / 255
    const finalB = (b * (1 - precFactor) + stormFog[2] * precFactor) / 255

    return new Color(finalR, finalG, finalB)
  })

  const fogDensity = computed(() => {
    // Koschmieder 법칙을 단순화해 가시거리를 안개 밀도로 변환하고, AQI로 연무를 더합니다.
    const visInMeters = Math.max(0.01, props.visibility) * 1000
    const densityFromVis = 3.912 / visInMeters

    const aqiClamped = Math.max(0, props.aqi)
    const densityFromAqi = (aqiClamped / 500) * 0.07

    return densityFromVis + densityFromAqi
  })

  return {
    ambientColor,
    ambientIntensity,
    directionalColor,
    directionalIntensity,
    fogColor,
    fogDensity,
  }
}
