// 3D scene 모듈들이 공유하는 공개 타입입니다.
// Vue props, Cesium controller, canvas renderer 사이의 계약을 여기로 모읍니다.
export interface SceneWeatherState {
  time: number
  cloudCover: number
  precipitation: number
  aqi: number
  visibility: number
  temperature: number
  windSpeed: number
  windDirectionDegrees: number
  humidity: number
}

export interface CameraWaypoint {
  longitude: number
  latitude: number
  height?: number
  headingDegrees?: number
  pitchDegrees?: number
  rollDegrees?: number
  duration?: number
}

export interface SceneLocation {
  id: string
  label: string
  city: string
  landmark: string
  lat: number
  lng: number
}

export interface SkyPhase {
  daylight: number
  dawn: number
  dusk: number
  horizonGlow: number
}

export type PrecipitationMode = 'rain' | 'snow' | null
