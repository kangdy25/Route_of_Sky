/** 대시보드 UI와 3D 씬이 공유하는 날씨/하늘 상태 모델입니다. */
export interface WeatherState {
  time: number
  /** 현재 기온입니다. 단위는 섭씨입니다. */
  temperature: number
  /** 현재 습도입니다. 0부터 100까지의 백분율입니다. */
  humidity: number
  /** 현재 풍속입니다. 단위는 m/s입니다. */
  windSpeed: number
  /** 대기질 지수입니다. */
  aqi: number
  /** 하늘을 덮은 구름의 비율입니다. 0부터 100까지의 백분율입니다. */
  cloudCover: number
  /** 시간당 강수량입니다. 단위는 mm/h입니다. */
  precipitation: number
  /** 가시거리입니다. 단위는 km입니다. */
  visibility: number
}
