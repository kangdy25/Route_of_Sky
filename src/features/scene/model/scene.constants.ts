// Cesium asset, 도시별 시그니처 카메라 뷰포인트, 날씨 효과 임계값을 한곳에 모아 둡니다.
// 렌더링 모듈들은 이 값을 공유해 같은 지리/시간 기준으로 동작합니다.
import type { SceneLocation, TimePreset } from './scene.types'

/** Cesium ion에서 호스팅하는 Google Photorealistic 3D Tiles 공식 에셋 ID */
export const GOOGLE_3D_TILES_ION_ASSET_ID = 2275207

/** 뉴욕 하계 서머타임(EDT) 기준 UTC 오프셋 (단위: 시간) */
export const NEW_YORK_TIMEZONE_OFFSET_HOURS = -4

/** 강수 파티클 렌더링 활성화 최소 임계값 (mm/h) */
export const PRECIPITATION_MODE_THRESHOLD = 0.05

/** 뇌우(Thunderstorm) 비주얼 전환 임계값 (mm/h) */
export const THUNDERSTORM_PRECIPITATION_THRESHOLD = 12

/** Cesium 포스트 프로세스 스테이지 등록 고유 식별자 */
export const WEATHER_POST_PROCESS_STAGE_NAME = 'route-of-sky-weather-grade'

/** 씬 기본 기준 일자 (2026년 하계 하지 전후 기준) */
export const SCENE_DATE = {
  year: 2026,
  /** 0-based month index (5 = 6월) */
  monthIndex: 5,
  day: 20,
}

/** 전 세계 주요 도시 프리셋 목록 */
export const WORLD_LOCATIONS = [
  {
    id: 'kr-seoul',
    label: '대한민국',
    city: '서울',
    landmark: '남산서울타워',
    lat: 37.5512,
    lng: 126.9882,
    utcOffsetHours: 9,
    cameraView: {
      longitude: 126.9882,
      latitude: 37.5395,
      height: 880,
      headingDegrees: 0,
      pitchDegrees: -24,
      rollDegrees: 0,
    },
  },
  {
    id: 'us-new-york',
    label: '미국',
    city: '뉴욕',
    landmark: '타임스퀘어',
    lat: 40.758,
    lng: -73.9855,
    utcOffsetHours: -4,
    cameraView: {
      longitude: -73.9875,
      latitude: 40.7525,
      height: 950,
      headingDegrees: 25,
      pitchDegrees: -32,
      rollDegrees: 0,
    },
  },
  {
    id: 'jp-tokyo',
    label: '일본',
    city: '도쿄',
    landmark: '도쿄타워',
    lat: 35.6586,
    lng: 139.7454,
    utcOffsetHours: 9,
    cameraView: {
      longitude: 139.7395,
      latitude: 35.6635,
      height: 750,
      headingDegrees: 140,
      pitchDegrees: -26,
      rollDegrees: 0,
    },
  },
  {
    id: 'il-jerusalem',
    label: '이스라엘',
    city: '예루살렘',
    landmark: '통곡의 벽',
    lat: 31.7767,
    lng: 35.2345,
    utcOffsetHours: 3,
    cameraView: {
      longitude: 35.2315,
      latitude: 31.7745,
      height: 1500,
      headingDegrees: 55,
      pitchDegrees: -28,
      rollDegrees: 0,
    },
  },
  {
    id: 'gb-london',
    label: '영국',
    city: '런던',
    landmark: '스탬퍼드 브리지',
    lat: 51.4817,
    lng: -0.191,
    utcOffsetHours: 1,
    cameraView: {
      longitude: -0.1958,
      latitude: 51.4785,
      height: 480,
      headingDegrees: 48,
      pitchDegrees: -32,
      rollDegrees: 0,
    },
  },
  {
    id: 'fr-paris',
    label: '프랑스',
    city: '파리',
    landmark: '에펠탑',
    lat: 48.8584,
    lng: 2.2945,
    utcOffsetHours: 2,
    cameraView: {
      longitude: 2.3015,
      latitude: 48.8535,
      height: 620,
      headingDegrees: 315,
      pitchDegrees: -25,
      rollDegrees: 0,
    },
  },
  {
    id: 'de-berlin',
    label: '독일',
    city: '베를린',
    landmark: '브란덴부르크 문',
    lat: 52.5163,
    lng: 13.3777,
    utcOffsetHours: 2,
    cameraView: {
      longitude: 13.3835,
      latitude: 52.5163,
      height: 280,
      headingDegrees: 270,
      pitchDegrees: -22,
      rollDegrees: 0,
    },
  },
  {
    id: 'au-sydney',
    label: '호주',
    city: '시드니',
    landmark: '시드니 오페라 하우스',
    lat: -33.8568,
    lng: 151.2153,
    utcOffsetHours: 10,
    cameraView: {
      longitude: 151.2105,
      latitude: -33.8535,
      height: 520,
      headingDegrees: 135,
      pitchDegrees: -30,
      rollDegrees: 0,
    },
  },
  {
    id: 'br-rio',
    label: '브라질',
    city: '리우데자네이루',
    landmark: '구세주 그리스도상',
    lat: -22.9519,
    lng: -43.2105,
    utcOffsetHours: -3,
    cameraView: {
      longitude: -43.2045,
      latitude: -22.9519,
      height: 850,
      headingDegrees: 270,
      pitchDegrees: -20,
      rollDegrees: 0,
    },
  },
  {
    id: 'in-agra',
    label: '인도',
    city: '아그라',
    landmark: '타지마할',
    lat: 27.1751,
    lng: 78.0421,
    utcOffsetHours: 5.5,
    cameraView: {
      longitude: 78.0421,
      latitude: 27.1705,
      height: 380,
      headingDegrees: 0,
      pitchDegrees: -25,
      rollDegrees: 0,
    },
  },
] as const satisfies readonly SceneLocation[]

/** 등록된 전 세계 프리셋 도시의 고유 식별자 유니온 타입 */
export type SceneLocationId = (typeof WORLD_LOCATIONS)[number]['id']

/** Settings UI 및 씬에서 공유하는 4대 표준 시간대 프리셋 */
export const TIME_PRESETS = [
  { key: 'dawn', label: '새벽', time: 6.2 },
  { key: 'noon', label: '정오', time: 12.0 },
  { key: 'sunset', label: '일몰', time: 18.6 },
  { key: 'night', label: '밤', time: 22.5 },
] as const satisfies readonly TimePreset[]

/** 절두체 및 렌더링 부하 제어를 위한 구름 LOD 파라미터 */
export const CLOUD_LOD = {
  minimumCover: 8,
  maxClouds: 34,
  altitude: 2800,
  longitudeSpan: 0.11,
  latitudeSpan: 0.08,
}
