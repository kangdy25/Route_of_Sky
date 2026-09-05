// 3D scene 모듈들이 공유하는 공개 타입입니다.

/** 4대 표준 시간대 프리셋 키 ('dawn': 새벽, 'noon': 정오, 'sunset': 일몰, 'night': 밤) */
export type TimePresetKey = 'dawn' | 'noon' | 'sunset' | 'night'

/** 시간대 프리셋 메타데이터 인터페이스 */
export interface TimePreset {
  key: TimePresetKey
  label: string
  time: number
}

/** 시간 및 태양 고도에 따라 산출되는 대기 광량/발광 비율 계수 (0.0 ~ 1.0). */
export interface SkyPhase {
  dawn: number
  noon: number
  sunset: number
  night: number
  /** 수평선 붉은 노을 발광 비율 (dawn과 sunset 중 최댓값) */
  horizonGlow: number
}

/** 3D 씬 및 기상 시뮬레이션에 주입되는 통합 기상 상태 스냅샷. */
export interface SceneWeatherState {
  /** 24시간제 소수점 표기 (0.00 ~ 24.00, 예: 14.5 = 14:30) */
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

/** Cesium 카메라 궤적 이동(flyTo) 및 뷰포인트 지점 메타데이터. */
export interface CameraWaypoint {
  longitude: number
  latitude: number
  /** 카메라 고도 (단위: m) */
  height?: number
  /** 방위각(Yaw, 도(degree) 단위. 0°: 북, 90°: 동) */
  headingDegrees?: number
  /** 고도각(Pitch, 도(degree) 단위. 0°: 지평선 수평, -90°: 직하향, -30°: 입체 부감 시점) */
  pitchDegrees?: number
  /** 경사각(Roll, 도(degree) 단위. 수평 기준 0°) */
  rollDegrees?: number
  /** 카메라 이동 애니메이션 시간 (단위: 초(s)) */
  duration?: number
}

/** 세계 주요 도시 프리셋 씬 메타데이터. */
export interface SceneLocation {
  id: string
  label: string
  city: string
  landmark: string
  lat: number
  lng: number
  /** UTC 오프셋 (단위: 시간, 서울 = +9, 런던 = 0) */
  utcOffsetHours: number
  /** 로케이션별 시그니처 조망을 위한 맞춤형 카메라 뷰 (미지정 시 기본 뷰 적용) */
  cameraView?: CameraWaypoint
}

/** 강수 렌더링 모드. (비, 눈 파티클 렌더링)*/
export type PrecipitationMode = 'rain' | 'snow' | null

/** 사용자 설정 그래픽 품질 모드 */
export type SceneQualityMode = 'auto' | 'high' | 'medium' | 'low'

/** 실제 렌더링 파이프라인에 적용되는 구체적 품질 수준 ('auto' 제외). */
export type SceneQualityLevel = Exclude<SceneQualityMode, 'auto'>

/** 그래픽 품질 등급별 세부 렌더링 파라미터 및 하드웨어 제약 프로필. */
export interface SceneQualityProfile {
  level: SceneQualityLevel
  /** 캔버스 렌더링 해상도 배율 (예: 1.0, 0.75) */
  resolutionScale: number
  /** 날씨 파티클/애니메이션 목표 FPS (예: 60, 30) */
  weatherFps: number
  /** 파티클 생성 수 배율 (1.0 = 100%) */
  particleMultiplier: number
  /** 동시 렌더링 가능한 최대 2D/3D 구름 개수 */
  maxClouds: number
  /** 블룸/뎁스오브필드 등 후처리(Post-processing) 셰이더 활성화 여부 */
  postProcessEnabled: boolean
  /** 눈 파티클 렌더링 시 연산 부하가 큰 셰이더 생략 여부 */
  simplifiedSnow: boolean
}
