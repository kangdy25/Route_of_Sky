/** 대시보드 UI와 3D 씬이 공유하는 날씨/하늘 상태 모델입니다. */
export interface WeatherState {
  time: number // 0~24 시간 (소수점 표기, 예: 16.5 = 16:30)
  temperature: number // 현재 기온 (℃)
  temperatureMin: number // 최저 기온 (℃)
  temperatureMax: number // 최고 기온 (℃)
  humidity: number // 습도 (0~100%)
  windSpeed: number // 풍속 (m/s)
  windDirectionDegrees: number // 풍향 각도 (0~360°, 0°: 북풍)
  aqi: number // 대기질 지수
  cloudCover: number // 운량 (0~100%)
  precipitation: number // 강수량 (mm/h)
  visibility: number // 가시거리 (km)
}

/** 날씨 상태의 일부만 부분적으로 업데이트할 때 사용하는 패치 타입입니다. */
export type WeatherStatePatch = Partial<WeatherState>
