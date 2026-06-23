import type { LensDroplet } from './scene.types'

export const GOOGLE_3D_TILES_ION_ASSET_ID = 2275207
export const SEOUL_TIMEZONE_OFFSET_HOURS = -9

export const SCENE_DATE = {
  year: 2026,
  monthIndex: 5,
  day: 20,
}

export const SEOUL_JAMSIL_VIEW = {
  longitude: 127.1026,
  latitude: 37.5125,
  height: 1750,
  headingDegrees: 314,
  pitchDegrees: -42,
}

export const SEOUL_SUMMER_SOLAR = {
  sunriseStart: 4.5,
  sunrise: 5.15,
  solarNoon: 12.55,
  sunset: 19.95,
  duskEnd: 20.65,
}

export const CLOUD_LOD = {
  minimumCover: 8,
  maxClouds: 34,
  altitude: 1550,
  longitudeSpan: 0.11,
  latitudeSpan: 0.08,
}

export const PRECIPITATION_MODE_THRESHOLD = 0.05
export const THUNDERSTORM_PRECIPITATION_THRESHOLD = 12
export const WEATHER_POST_PROCESS_STAGE_NAME = 'route-of-sky-weather-grade'

export const LENS_DROPLETS: LensDroplet[] = [
  { left: 5, top: 18, size: 58, stretch: 1.42, alpha: 0.82 },
  { left: 13, top: 77, size: 34, stretch: 1.9, alpha: 0.66 },
  { left: 23, top: 8, size: 28, stretch: 1.22, alpha: 0.52 },
  { left: 73, top: 10, size: 46, stretch: 1.58, alpha: 0.76 },
  { left: 91, top: 27, size: 36, stretch: 1.78, alpha: 0.72 },
  { left: 84, top: 82, size: 54, stretch: 1.36, alpha: 0.7 },
  { left: 47, top: 5, size: 30, stretch: 1.52, alpha: 0.46 },
  { left: 98, top: 64, size: 24, stretch: 2.25, alpha: 0.58 },
  { left: 33, top: 93, size: 42, stretch: 1.34, alpha: 0.54 },
  { left: 64, top: 96, size: 32, stretch: 1.72, alpha: 0.48 },
]
