import { Math as CesiumMath } from 'cesium'
import type { SceneWeatherState, SkyPhase } from '../model/scene.types'
import { clampToUnitInterval } from './math'
import { getSkyPhase } from './sky'
import { getSnowstormIntensity, getThunderstormIntensity } from './weather'

/** GC 방지용 내부 전용 SkyPhase 버퍼 */
const overlaySkyPhaseScratch: SkyPhase = {
  dawn: 0,
  daylight: 0,
  sunset: 0,
  night: 0,
  horizonGlow: 0,
}

/** 하늘의 기본 명암, 비/폭풍의 어두운 먹구름 톤, 미세먼지(AQI) 황사 층을 합성한 다중 그래디언트 스타일을 산출합니다. */
export function getAtmosphereOverlayStyle(state: SceneWeatherState) {
  const sky = getSkyPhase(state.time, overlaySkyPhaseScratch)

  // 기상 요소별 레이어 투명도 산출
  const cloudAlpha = Math.min(0.34, Math.max(0.04, state.cloudCover / 280))
  const rainAlpha = Math.min(0.22, Math.max(0, state.precipitation / 360))
  const stormAlpha = getThunderstormIntensity(state) * 0.32
  const hazeAlpha = Math.min(0.28, Math.max(0.02, (20 - state.visibility) / 80 + state.aqi / 900))
  const dustAlpha = CesiumMath.lerp(0, 0.2, clampToUnitInterval((state.aqi - 80) / 180))

  // 낮에는 맑고 투명하게(0.42), 밤에는 어둡게 가라앉히는(0.92) 배경 감쇄 계수
  const dimFactor = CesiumMath.lerp(0.92, 0.42, sky.daylight)

  return {
    background: [
      // 가운데는 은은한 하늘빛을 띄우고, 모서리 쪽은 밤하늘처럼 어둡게 눌러주는 기본 조명
      `radial-gradient(circle at 50% 35%, rgba(34, 211, 238, ${0.04 + sky.daylight * 0.04}), rgba(2, 6, 23, ${0.16 * dimFactor}) 52%, rgba(2, 6, 23, ${0.48 * dimFactor}) 100%)`,
      // 뇌우나 폭풍이 칠 때 화면 전체를 시커멓게 뒤덮는 먹구름 그림자
      `linear-gradient(180deg, rgba(15, 23, 42, ${stormAlpha}) 0%, rgba(30, 41, 59, ${stormAlpha * 0.62}) 45%, rgba(2, 6, 23, ${stormAlpha * 0.86}) 100%)`,
      // 미세먼지나 황사가 심할 때 화면을 탁하게 만드는 누런 흙먼지 층
      `linear-gradient(180deg, rgba(120, 86, 28, ${dustAlpha * 0.55}) 0%, rgba(161, 98, 7, ${dustAlpha}) 58%, rgba(92, 64, 24, ${dustAlpha * 0.75}) 100%)`,
      // 구름양과 비, 안개 정도에 따라 화면 아래쪽 지표면을 흐리고 어둡게 가려주는 층
      `linear-gradient(180deg, rgba(15, 23, 42, ${cloudAlpha * dimFactor}) 0%, rgba(8, 13, 25, ${(rainAlpha + 0.12) * dimFactor}) 52%, rgba(2, 6, 23, ${(hazeAlpha + 0.2) * dimFactor}) 100%)`,
    ].join(', '),
  }
}

/** 가시거리 저하, 고습도, 미세먼지로 인해 발생하는 옅은 안개와 블러 효과 스타일을 산출합니다. */
export function getMistOverlayStyle(state: SceneWeatherState) {
  const sky = getSkyPhase(state.time, overlaySkyPhaseScratch)

  // 가시거리, AQI, 강수량을 결합한 안개 종합 강도 계산
  const visibilityMist = clampToUnitInterval((12 - state.visibility) / 10)
  const aqiMist = clampToUnitInterval((state.aqi - 80) / 180)
  const precipitationMist = clampToUnitInterval(state.precipitation / 18) * 0.38
  const mistStrength = clampToUnitInterval(visibilityMist + aqiMist * 0.46 + precipitationMist)

  // 밤 시간대에는 안개가 가로등/달빛을 산란시켜 더 짙게 느껴지도록 가중치 적용
  const nightBoost = CesiumMath.lerp(1.18, 0.82, sky.daylight)
  const opacity = mistStrength * nightBoost

  // 지평선 부근과 하단 도심지의 안개 농도 보간
  const lowerMist = CesiumMath.lerp(0.08, 0.42, opacity)
  const horizonMist = CesiumMath.lerp(0.02, 0.24, opacity)

  return {
    opacity,
    background: `radial-gradient(ellipse at 50% 82%, rgba(226, 232, 240, ${lowerMist}), rgba(148, 163, 184, ${horizonMist}) 34%, transparent 68%), linear-gradient(180deg, transparent 0%, rgba(203, 213, 225, ${horizonMist * 0.52}) 42%, rgba(148, 163, 184, ${lowerMist}) 100%)`,
    backdropFilter: `blur(${CesiumMath.lerp(0, 2.8, mistStrength)}px)`,
  }
}

/** 강풍을 동반한 폭설 시 발생하는 시야 차단과 블러, 채도 저하 스타일을 산출합니다. */
export function getWhiteoutOverlayStyle(state: SceneWeatherState) {
  const intensity = getSnowstormIntensity(state)
  const opacity = CesiumMath.lerp(0, 0.48, intensity)

  // 화면 하단(지표면)과 상단 하늘의 눈보라 장막 밀도
  const lowerVeil = CesiumMath.lerp(0.06, 0.42, intensity)
  const upperVeil = CesiumMath.lerp(0.01, 0.18, intensity)

  return {
    opacity,
    background: `radial-gradient(ellipse at 50% 54%, rgba(248, 250, 252, ${lowerVeil}), rgba(226, 232, 240, ${upperVeil}) 42%, transparent 78%), linear-gradient(90deg, rgba(241, 245, 249, ${upperVeil}) 0%, rgba(226, 232, 240, ${lowerVeil * 0.72}) 48%, rgba(248, 250, 252, ${upperVeil}) 100%)`,
    backdropFilter: `blur(${CesiumMath.lerp(0, 2.4, intensity)}px) saturate(${CesiumMath.lerp(1, 0.86, intensity)})`,
  }
}

/** 하루 24시간 주기에 따른 주간의 푸른 하늘빛과 새벽·일몰의 붉은 노을 톤을 생성합니다. */
export function getSkyTimeStyle(state: SceneWeatherState) {
  const sky = getSkyPhase(state.time, overlaySkyPhaseScratch)

  // 새벽·일몰 시간대의 붉은 노을빛 세기와 야간 투명도 계산
  const dawnWarmth = sky.dawn + sky.sunset
  const nightOpacity = 1 - sky.daylight
  const dayBlue = 0.28 + sky.daylight * 0.42
  const horizonWarmth = 0.12 + dawnWarmth * 0.72
  const roseGlow = dawnWarmth * clampToUnitInterval(state.cloudCover / 90)

  // 시간대별 하늘 바탕색 그래디언트 스타일
  return {
    opacity: CesiumMath.lerp(0.66, 0.92, sky.daylight),
    background: `radial-gradient(ellipse at 50% 82%, rgba(251, 146, 60, ${horizonWarmth}), rgba(244, 114, 182, ${roseGlow * 0.26}) 24%, rgba(245, 158, 11, ${dawnWarmth * 0.32}) 38%, rgba(180, 83, 9, ${dawnWarmth * 0.16}) 58%, transparent 76%), linear-gradient(180deg, rgba(56, 189, 248, ${dayBlue}) 0%, rgba(125, 211, 252, ${0.12 + sky.daylight * 0.18}) 30%, rgba(252, 211, 77, ${dawnWarmth * 0.24}) 54%, rgba(244, 114, 182, ${roseGlow * 0.18}) 68%, rgba(249, 115, 22, ${dawnWarmth * 0.28}) 80%, rgba(15, 23, 42, ${0.72 * nightOpacity}) 100%)`,
  }
}

/** 일출 및 일몰 시간대에 구름 밑단이 노을빛에 붉게 타오르는 산란광 스타일을 산출합니다. */
export function getTwilightCloudGlowStyle(state: SceneWeatherState) {
  const sky = getSkyPhase(state.time, overlaySkyPhaseScratch)
  const twilight = clampToUnitInterval(sky.dawn + sky.sunset)

  // 구름량이 적절히 존재해야 노을빛을 반사하므로 최소 18% 이상부터 반응
  const cloudFactor = clampToUnitInterval((state.cloudCover - 18) / 82)
  // 강수가 심해지면 먹구름에 가려 노을빛이 먹히므로 감쇄 적용
  const precipitationDampening = CesiumMath.lerp(1, 0.62, clampToUnitInterval(state.precipitation / 14))

  // 세 조건의 결합으로 최종 구름 노을빛 투명도 결정
  const opacity = twilight * cloudFactor * precipitationDampening

  return {
    opacity,
    background: `linear-gradient(180deg, transparent 0%, rgba(252, 211, 77, ${0.08 * opacity}) 34%, rgba(251, 146, 60, ${0.24 * opacity}) 58%, rgba(244, 114, 182, ${0.2 * opacity}) 76%, transparent 100%), radial-gradient(ellipse at 50% 72%, rgba(251, 113, 133, ${0.22 * opacity}), rgba(251, 146, 60, ${0.14 * opacity}) 38%, transparent 72%)`,
  }
}
