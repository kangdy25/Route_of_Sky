// Cesium asset, 서울 기준 카메라 위치, 날씨 효과 임계값을 한곳에 모아 둡니다.
// 렌더링 모듈들은 이 값을 공유해 같은 지리/시간 기준으로 동작합니다.
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

// 구름 수와 분포 범위는 성능과 밀도 사이의 균형점입니다.
export const CLOUD_LOD = {
  minimumCover: 8,
  maxClouds: 34,
  altitude: 2800,
  longitudeSpan: 0.11,
  latitudeSpan: 0.08,
}

export const PRECIPITATION_MODE_THRESHOLD = 0.05
export const THUNDERSTORM_PRECIPITATION_THRESHOLD = 12
export const WEATHER_POST_PROCESS_STAGE_NAME = 'route-of-sky-weather-grade'
