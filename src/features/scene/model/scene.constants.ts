// Cesium asset, 뉴욕 타임스퀘어 기준 카메라 위치, 날씨 효과 임계값을 한곳에 모아 둡니다.
// 렌더링 모듈들은 이 값을 공유해 같은 지리/시간 기준으로 동작합니다.
export const GOOGLE_3D_TILES_ION_ASSET_ID = 2275207
export const NEW_YORK_TIMEZONE_OFFSET_HOURS = 4

export const SCENE_DATE = {
  year: 2026,
  monthIndex: 5,
  day: 20,
}

export const NEW_YORK_TIMES_SQUARE_VIEW = {
  longitude: -73.9855,
  latitude: 40.758,
  height: 1650,
  headingDegrees: 28,
  pitchDegrees: -38,
}

export const NEW_YORK_SUMMER_SOLAR = {
  sunriseStart: 4.75,
  sunrise: 5.4,
  solarNoon: 12.95,
  sunset: 20.5,
  duskEnd: 21.25,
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
