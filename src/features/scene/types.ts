/** 3D 씬의 대기/조명 계산에 필요한 날씨 입력값입니다. */
export interface SceneWeatherProps {
  time: number
  cloudCover: number
  precipitation: number
  aqi: number
  visibility: number
}

/** 태양 고도에서 파생되는 시간대별 조명 혼합 계수입니다. */
export interface TimeFactors {
  dayFactor: number
  nightFactor: number
  sunsetFactor: number
}
