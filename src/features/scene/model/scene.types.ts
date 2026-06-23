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

export interface LensDroplet {
  left: number
  top: number
  size: number
  stretch: number
  alpha: number
}

export interface SkyPhase {
  daylight: number
  dawn: number
  dusk: number
  horizonGlow: number
}

export type PrecipitationMode = 'rain' | 'snow' | null
