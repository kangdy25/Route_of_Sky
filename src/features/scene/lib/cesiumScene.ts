import { gsap } from 'gsap'
import {
  CameraEventType,
  Cartesian3,
  ClockRange,
  Color,
  DynamicAtmosphereLightingType,
  JulianDate,
  KeyboardEventModifier,
  Math as CesiumMath,
  SunLight,
  Viewer,
} from 'cesium'

import { WORLD_LOCATIONS } from '../model/scene.constants'
import type { CameraWaypoint, SceneLocation, SceneWeatherState, SkyPhase } from '../model/scene.types'
import { clampToRange, clampToUnitInterval, lerpRadians } from './math'
import { getSceneDateFromLocalTime, getSkyPhase } from './sky'
import { getSnowstormIntensity, getWeatherTint } from './weather'

// --- GC 및 DOM 강제 리플로우 방지를 위한 캐싱/Scratch 버퍼 ---
const COLOR_BACKGROUND_NIGHT = Color.fromCssColorString('#020617')
const COLOR_BACKGROUND_DAY = Color.fromCssColorString('#0f2747')

/** GC 방지용 내부 전용 SkyPhase 버퍼 */
const atmosphereSkyPhaseScratch: SkyPhase = {
  dawn: 0,
  daylight: 0,
  sunset: 0,
  night: 0,
  horizonGlow: 0,
}
/** 배경색 보간용 Color 임시 버퍼 */
const atmosphereColorScratch = new Color()

// Cesium 시계 설정용 JulianDate 임시 버퍼들
const currentTimeScratch = new JulianDate()
const startTimeScratch = new JulianDate()
const stopTimeScratch = new JulianDate()

/** 카메라 비행 위치 보간용 Cartesian3 버퍼 */
const flightCurrentPositionScratch = new Cartesian3()

/** Cesium Viewer의 기본 렌더 환경(태양, 조명, 대기, 카메라 컨트롤)을 초기화합니다. */
export function configureViewerScene(viewer: Viewer) {
  viewer.scene.backgroundColor = COLOR_BACKGROUND_NIGHT

  // 지구 둥근 테두리에 푸른빛으로 감도는 대기권 효과를 켜고, 렌더링 품질 방식을 지정합니다.
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.show = true
    viewer.scene.skyAtmosphere.perFragmentAtmosphere = false
  }
  // 하늘에 태양 그래픽을 띄우고 햇빛 번짐 효과를 키웁니다.
  if (viewer.scene.sun) {
    viewer.scene.sun.show = true
    viewer.scene.sun.glowFactor = 1.8
  }
  // 밤 시간대에 보일 달 그래픽을 활성화합니다.
  if (viewer.scene.moon) {
    viewer.scene.moon.show = true
  }
  viewer.scene.sunBloom = true
  viewer.scene.light = new SunLight({ intensity: 2.0 })
  viewer.scene.atmosphere.dynamicLighting = DynamicAtmosphereLightingType.SUNLIGHT
  viewer.scene.fog.enabled = true
  viewer.scene.globe.show = false
  configureCameraControls(viewer)
}

/** 마우스 및 터치 입력에 따른 카메라 궤도 회전, 줌, 관성 파라미터를 설정합니다. */
export function configureCameraControls(viewer: Viewer) {
  const controller = viewer.scene.screenSpaceCameraController

  // 기본 입력 및 조작 기능 활성화
  controller.enableInputs = true
  controller.enableRotate = true
  controller.enableTranslate = true
  controller.enableZoom = true
  controller.enableTilt = true
  controller.enableLook = true

  // 줌 가용 범위 및 틸트 각도 제한
  controller.minimumZoomDistance = 80
  controller.maximumZoomDistance = 10000
  controller.maximumTiltAngle = undefined

  // 관성 감속 계수 (0: 즉각 정지 ~ 1: 미끄러짐 지속)
  controller.inertiaSpin = 0.45
  controller.inertiaTranslate = 0.45
  controller.inertiaZoom = 0.35

  // 줌 이벤트 트리거 매핑
  controller.zoomEventTypes = [CameraEventType.WHEEL, CameraEventType.PINCH]

  // 시점 둘러보기(Look / Tilt) 단축키 조합 매핑
  controller.lookEventTypes = [
    CameraEventType.RIGHT_DRAG,
    {
      eventType: CameraEventType.LEFT_DRAG,
      modifier: KeyboardEventModifier.SHIFT,
    },
  ]
}

/** 특정 지역의 정의된 초기 카메라 시점으로 순간 이동시킵니다. */
export function setInitialLocationView(viewer: Viewer, location: SceneLocation = WORLD_LOCATIONS[1]) {
  // 커스텀 카메라 각이 정의되어 있으면 우선 적용하고, 없으면 기본 중심 좌표 및 기본 각도로 폴백
  const view = location.cameraView
  const targetLng = view?.longitude ?? location.lng
  const targetLat = view?.latitude ?? location.lat
  const targetHeight = view?.height ?? 1200
  const heading = view?.headingDegrees ?? 0
  const pitch = view?.pitchDegrees ?? -35
  const roll = view?.rollDegrees ?? 0

  // WGS84 경위도 및 Degree 각도를 Cesium 3D 데카르트 좌표 및 Radian으로 변환하여 즉각 적용
  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(targetLng, targetLat, targetHeight),
    orientation: {
      heading: CesiumMath.toRadians(heading),
      pitch: CesiumMath.toRadians(pitch),
      roll: CesiumMath.toRadians(roll),
    },
  })
}

/** 날씨 상태(시간, 가시거리, 미세먼지, 강수량)를 물리 공식에 따라 대기, 안개, 배경색에 실시간 투영합니다. */
export function applyAtmosphereToScene(viewer: Viewer, state: SceneWeatherState) {
  const sky = getSkyPhase(state.time, atmosphereSkyPhaseScratch)
  const visibilityKm = clampToRange(state.visibility, 0.1, 30)
  const visibilityFactor = clampToUnitInterval((20 - visibilityKm) / 20)
  const aqiHazeFactor = clampToUnitInterval((state.aqi - 45) / 180)
  const precipitationHazeFactor = clampToUnitInterval(state.precipitation / 16)
  const snowstormHazeFactor = getSnowstormIntensity(state)
  const nightFactor = sky.night

  /**  Koschmieder의 대기 소산 법칙: 소산 계수 beta = 3.912 / V */
  const extinctionCoefficient = 3.912 / (visibilityKm * 1000)
  const fogDensity = clampToRange(
    extinctionCoefficient * (1 + aqiHazeFactor * 2.2 + precipitationHazeFactor * 0.9 + snowstormHazeFactor * 1.8),
    0.000045,
    0.0034,
  )
  const fogTint = getWeatherTint(state)

  // 안개(Fog) 파라미터 적용
  viewer.scene.fog.enabled = visibilityKm < 22 || state.aqi > 65 || snowstormHazeFactor > 0 || state.precipitation > 0.2
  viewer.scene.fog.renderable = true
  viewer.scene.fog.density = fogDensity
  viewer.scene.fog.minimumBrightness = CesiumMath.lerp(0.018, 0.16, sky.daylight)
  viewer.scene.fog.screenSpaceErrorFactor = CesiumMath.lerp(1.4, 3.4, Math.max(visibilityFactor, snowstormHazeFactor))
  viewer.scene.fog.visualDensityScalar = CesiumMath.lerp(
    0.16,
    0.72,
    Math.max(visibilityFactor, aqiHazeFactor, snowstormHazeFactor),
  )

  // 배경색 보간 (정적 Color 인스턴스 사용으로 문자열 파싱 Reflow 완전 제거)
  const baseBgColor = sky.daylight > 0.1 ? COLOR_BACKGROUND_DAY : COLOR_BACKGROUND_NIGHT
  const blendRatio = CesiumMath.lerp(0.08, 0.28, Math.max(visibilityFactor, aqiHazeFactor, snowstormHazeFactor * 0.56))
  viewer.scene.backgroundColor = Color.lerp(baseBgColor, fogTint, blendRatio, atmosphereColorScratch)

  // 하늘 대기 산란광 조절
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.atmosphereLightIntensity = CesiumMath.lerp(3.0, 12.0, sky.daylight)
    viewer.scene.skyAtmosphere.hueShift = CesiumMath.lerp(-0.08, 0.02, sky.daylight) + aqiHazeFactor * 0.06
    viewer.scene.skyAtmosphere.saturationShift =
      CesiumMath.lerp(-0.18, 0.08, sky.daylight) - visibilityFactor * 0.14 + aqiHazeFactor * 0.08
    viewer.scene.skyAtmosphere.brightnessShift =
      CesiumMath.lerp(-0.55, 0.12, sky.daylight) - precipitationHazeFactor * 0.1 - snowstormHazeFactor * 0.1
  }

  // 광원 및 천체 제어
  if (viewer.scene.light instanceof SunLight) {
    viewer.scene.light.intensity = CesiumMath.lerp(0.05, 2.0, sky.daylight)
  }
  if (viewer.scene.sun) {
    viewer.scene.sun.glowFactor = CesiumMath.lerp(1.1, 3.1, sky.horizonGlow)
  }
  if (viewer.scene.moon) {
    viewer.scene.moon.show = nightFactor > 0.25
  }

  viewer.scene.requestRender()
}

/** Cesium 내부 시계를 현재 날씨 타임라인 시간(0~24시)으로 동기화합니다. */
export function applySceneTime(viewer: Viewer, state: SceneWeatherState, location: SceneLocation = WORLD_LOCATIONS[1]) {
  // Cesium 전용 천문학 시간(JulianDate)으로 변환해 Scratch 버퍼에 덮어씀 (GC 부하 차단)
  JulianDate.fromDate(getSceneDateFromLocalTime(state.time, location), currentTimeScratch)
  JulianDate.fromDate(getSceneDateFromLocalTime(0, location), startTimeScratch)
  JulianDate.fromDate(getSceneDateFromLocalTime(24, location), stopTimeScratch)

  // Cesium 내부 시계 범위 및 현재 시각 설정 (태양·달의 공전 각도 동기화)
  viewer.clock.startTime = startTimeScratch
  viewer.clock.stopTime = stopTimeScratch
  viewer.clock.currentTime = currentTimeScratch
  viewer.clock.clockRange = ClockRange.LOOP_STOP

  // 엔진 자체 시간 자동 진행 차단 (UI 슬라이더 수동 제어 목적)
  viewer.clock.shouldAnimate = false
  viewer.clock.multiplier = 1

  // 시간 변경에 따른 태양 위치 및 그림자 갱신을 위해 씬 렌더링 요청
  viewer.scene.requestRender()
}

export interface CameraFlightCallbacks {
  /** 비행 시작 시 호출되는 콜백 */
  onStart?: () => void
  /** 비행 완료 또는 중단 시 호출되는 콜백 */
  onFinish?: () => void
}

/** GSAP Tween을 활용하여 원하는 위치 및 각도로 부드럽게 카메라를 이동시키는 컨트롤러 */
export class CameraFlyToController {
  private activeTween: gsap.core.Tween | null = null
  private activeFlightId = 0
  private activeOnFinish: (() => void) | null = null
  private readonly getViewer: () => Viewer | null

  constructor(getViewer: () => Viewer | null) {
    this.getViewer = getViewer
  }

  /** 지정된 웨이포인트 또는 지역 좌표로 카메라 비행 트윈을 시작합니다. */
  flyToLocation(target: CameraWaypoint | SceneLocation, callbacks: CameraFlightCallbacks = {}) {
    const viewer = this.getViewer()
    if (!viewer) return

    // 이미 비행 중인 트윈이 있다면 즉시 강제 종료하고 비행 ID를 새로 발급
    this.finishActiveFlight()
    const flightId = ++this.activeFlightId
    this.activeOnFinish = callbacks.onFinish ?? null
    callbacks.onStart?.()

    // 목적지 파라미터(경도, 위도, 고도, 방위각, 피치, 롤, 소요시간) 추출
    let targetLng: number
    let targetLat: number
    let targetHeight: number
    let targetHeading: number
    let targetPitch: number
    let targetRoll: number
    let targetDuration: number

    // 입력 타깃이 SceneLocation 타입인지 판별 (city나 landmark 키 유무로 타입 가드)
    if ('city' in target || 'landmark' in target) {
      const loc = target as SceneLocation
      const view = loc.cameraView
      targetLng = view?.longitude ?? loc.lng
      targetLat = view?.latitude ?? loc.lat
      targetHeight = view?.height ?? 1200
      targetHeading = view?.headingDegrees ?? 0
      targetPitch = view?.pitchDegrees ?? -35
      targetRoll = view?.rollDegrees ?? 0
      targetDuration = view?.duration ?? 3.2
    }
    // CameraWaypoint 타입인 경우
    else {
      const wp = target as CameraWaypoint
      targetLng = wp.longitude
      targetLat = wp.latitude
      targetHeight = wp.height ?? 1200
      targetHeading = wp.headingDegrees ?? 0
      targetPitch = wp.pitchDegrees ?? -35
      targetRoll = wp.rollDegrees ?? 0
      targetDuration = wp.duration ?? 3.2
    }

    // 시작 및 종료 시점의 공간 좌표(ECEF Cartesian3) 준비
    const camera = viewer.camera
    const startPosition = Cartesian3.clone(camera.positionWC)
    const endPosition = Cartesian3.fromDegrees(targetLng, targetLat, targetHeight)

    // 시작 및 종료 시점의 회전각(Radian) 준비
    const startHeading = camera.heading
    const startPitch = camera.pitch
    const startRoll = camera.roll
    const endHeading = CesiumMath.toRadians(targetHeading)
    const endPitch = CesiumMath.toRadians(targetPitch)
    const endRoll = CesiumMath.toRadians(targetRoll)

    // GSAP이 0에서 1까지 보간할 진척도 객체
    const progress = { value: 0 }
    let completed = false

    // GSAP 트윈 실행 (진척도 progress.value: 0 -> 1)
    const tween = gsap.to(progress, {
      value: 1,
      duration: targetDuration,
      ease: 'power3.inOut', // 부드러운 가속 후 감속 곡선 적용

      // 매 프레임마다 카메라의 위치와 각도를 갱신
      onUpdate: () => {
        const activeViewer = this.getViewer()
        if (!activeViewer) return

        // 3D 공간 선형 보간 (GC 방지를 위해 전역 flightCurrentPositionScratch 버퍼 재사용)
        Cartesian3.lerp(startPosition, endPosition, progress.value, flightCurrentPositionScratch)

        // 카메라 위치 및 화각을 갱신
        activeViewer.camera.setView({
          destination: flightCurrentPositionScratch,
          orientation: {
            // 360도 경계 회전 문제를 방지하기 위해 최단 경로 라디안 보간 lerpRadians 사용
            heading: lerpRadians(startHeading, endHeading, progress.value),
            pitch: CesiumMath.lerp(startPitch, endPitch, progress.value),
            roll: CesiumMath.lerp(startRoll, endRoll, progress.value),
          },
        })
        // requestRenderMode 환경이므로 변경된 1프레임을 화면에 그리기 위해 렌더 요청
        activeViewer.scene.requestRender()
      },

      // 비행 완료 시 후처리
      onComplete: () => {
        completed = true
        // requestRenderMode에서는 트윈 종료 후에도 최종 1프레임을 추가 요청해야
        // 새로 안착한 시점 기준의 고해상도 3D Tiles 로딩/선택 파이프라인이 정상 트리거됨
        const activeViewer = this.getViewer()
        activeViewer?.scene.requestRender()

        // 도중에 다른 새 비행이 끼어들지 않고 온전히 끝난 경우에만 완료 콜백 실행
        if (this.activeFlightId === flightId) {
          this.activeTween = null
          this.activeOnFinish?.()
          this.activeOnFinish = null
        }
      },
    })

    // 동기식 완료(지속시간 0 등)가 아니며 세션 ID가 유효한 경우 인스턴스에 트윈 등록
    if (!completed && this.activeFlightId === flightId) {
      this.activeTween = tween
    }
  }

  /** 진행 중인 비행 트윈을 즉시 중단하고 정리합니다. */
  dispose() {
    this.finishActiveFlight()
  }

  /** 활성화된 트윈을 강제 종료하고 완료 콜백을 안전하게 호출합니다. */
  private finishActiveFlight() {
    const hadActiveFlight = this.activeTween !== null || this.activeOnFinish !== null

    // 이전 트윈 즉시 킬 및 GC 정리
    this.activeTween?.kill()
    this.activeTween = null

    // 비행 세션 ID를 올려 이전 트윈의 비동기 onComplete 콜백이 무효화되도록 방어
    this.activeFlightId += 1

    // 중단되더라도 등록된 완료 콜백은 안전하게 1회 호출
    if (hadActiveFlight) this.activeOnFinish?.()

    this.activeOnFinish = null
  }
}
