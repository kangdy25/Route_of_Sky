// Cesium asset, 뉴욕 타임스퀘어 기준 카메라 위치, 날씨 효과 임계값을 한곳에 모아 둡니다.
// 렌더링 모듈들은 이 값을 공유해 같은 지리/시간 기준으로 동작합니다.
import type { SceneLocation } from './scene.types'

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

export const WORLD_LOCATIONS = [
  {
    id: 'kr-seoul',
    label: '대한민국',
    city: '서울',
    landmark: '남산서울타워',
    lat: 37.5512,
    lng: 126.9882,
    utcOffsetHours: 9,
  },
  {
    id: 'us-new-york',
    label: '미국',
    city: '뉴욕',
    landmark: '타임스퀘어',
    lat: 40.758,
    lng: -73.9855,
    utcOffsetHours: -4,
  },
  {
    id: 'jp-tokyo',
    label: '일본',
    city: '도쿄',
    landmark: '도쿄타워',
    lat: 35.6586,
    lng: 139.7454,
    utcOffsetHours: 9,
  },
  {
    id: 'il-jerusalem',
    label: '이스라엘',
    city: '예루살렘',
    landmark: '통곡의 벽',
    lat: 31.7767,
    lng: 35.2345,
    utcOffsetHours: 3,
  },
  {
    id: 'gb-london',
    label: '영국',
    city: '런던',
    landmark: '빅벤',
    lat: 51.5007,
    lng: -0.1246,
    utcOffsetHours: 1,
  },
  {
    id: 'fr-paris',
    label: '프랑스',
    city: '파리',
    landmark: '에펠탑',
    lat: 48.8584,
    lng: 2.2945,
    utcOffsetHours: 2,
  },
  {
    id: 'de-berlin',
    label: '독일',
    city: '베를린',
    landmark: '브란덴부르크 문',
    lat: 52.5163,
    lng: 13.3777,
    utcOffsetHours: 2,
  },
  {
    id: 'au-sydney',
    label: '호주',
    city: '시드니',
    landmark: '시드니 오페라 하우스',
    lat: -33.8568,
    lng: 151.2153,
    utcOffsetHours: 10,
  },
  {
    id: 'br-rio',
    label: '브라질',
    city: '리우데자네이루',
    landmark: '구세주 그리스도상',
    lat: -22.9519,
    lng: -43.2105,
    utcOffsetHours: -3,
  },
  {
    id: 'in-agra',
    label: '인도',
    city: '아그라',
    landmark: '타지마할',
    lat: 27.1751,
    lng: 78.0421,
    utcOffsetHours: 5.5,
  },
] satisfies SceneLocation[]

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
