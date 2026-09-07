import type { SceneQualityLevel, SceneQualityMode, SceneQualityProfile } from '../model/scene.types'

/** 프레임 타임을 수집하여 품질을 평가하는 윈도우 주기 (5초) */
export const QUALITY_SAMPLE_WINDOW_MS = 5_000
/** 품질 등급 변경 후 다음 평가까지 대기하는 안정화 쿨다운 시간 (10초) */
export const QUALITY_COOLDOWN_MS = 10_000
/** 프레임 지연 상위 5%(P95)가 40ms(25 FPS 미만)를 초과할 경우 즉시 품질 하향 */
export const QUALITY_DOWNGRADE_P95_MS = 40
/** 프레임 지연 P95가 25ms(40 FPS 이상) 미만으로 쾌적할 경우 상향 검토 기준 */
export const QUALITY_UPGRADE_P95_MS = 25
/** 품질 상향 전 쾌적한 상태가 연속으로 유지되어야 하는 윈도우 횟수 (3회 = 15초) */
export const QUALITY_UPGRADE_WINDOWS = 3
/** 품질 등급별 세부 그래픽 렌더링 프로필 */
export const SCENE_QUALITY_PROFILES: Record<SceneQualityLevel, SceneQualityProfile> = {
  high: {
    level: 'high',
    resolutionScale: 1,
    weatherFps: 30,
    particleMultiplier: 1,
    maxClouds: 34,
    postProcessEnabled: true,
    simplifiedSnow: false,
  },
  medium: {
    level: 'medium',
    resolutionScale: 0.85,
    weatherFps: 24,
    particleMultiplier: 0.7,
    maxClouds: 22,
    postProcessEnabled: true,
    simplifiedSnow: false,
  },
  low: {
    level: 'low',
    resolutionScale: 0.7,
    weatherFps: 20,
    particleMultiplier: 0.45,
    maxClouds: 12,
    postProcessEnabled: false,
    simplifiedSnow: true,
  },
}

/** 기기의 CPU 코어 수와 메모리 사양을 평가하여 기본 권장 품질을 결정합니다.
 *
 * @param {object} device 브라우저 navigator 객체 또는 하드웨어 스펙
 * @returns {SceneQualityLevel} 저사양 기기인 경우 medium, 일반/고사양 기기인 경우 high
 */
export function getRecommendedAutoQuality(
  device: { deviceMemory?: number; hardwareConcurrency?: number } = typeof navigator === 'undefined' ? {} : navigator,
): SceneQualityLevel {
  const hardwareConcurrency = device.hardwareConcurrency ?? 8
  const deviceMemory = device.deviceMemory ?? 8

  // 4코어 이하 또는 4GB 이하 램을 탑재한 저사양 환경에서는 기본 medium으로 시작
  return hardwareConcurrency <= 4 || deviceMemory <= 4 ? 'medium' : 'high'
}

/** 수집된 프레임 간격 데이터에서 95번째 백분위수(상위 5% 최악의 지연 시간)를 산출합니다. */
function percentile95(values: number[]) {
  if (!values.length) return 0

  // 얕은 복사본을 정렬하여 상위 95% 위치의 지연 시간을 도출
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index]
}

/** 현재 품질 등급을 한 단계 낮춥니다. (최소 'low') */
function lowerQuality(level: SceneQualityLevel): SceneQualityLevel {
  if (level === 'high') return 'medium'
  return 'low'
}

/** 현재 품질 등급을 한 단계 높입니다. (최대 'high') */
function higherQuality(level: SceneQualityLevel): SceneQualityLevel {
  if (level === 'low') return 'medium'
  return 'high'
}

interface AdaptiveSceneQualityOptions {
  /** 현재 활성화된 품질 등급 조회 함수 */
  getLevel: () => SceneQualityLevel
  /** 현재 동작 모드('auto' | 'manual') 조회 함수 */
  getMode: () => SceneQualityMode
  /** 품질 변경 발생 시 실행될 콜백 */
  onLevelChange: (level: SceneQualityLevel, frameP95Ms: number) => void
}

/** 프레임 속도를 측정하여 기기 성능에 맞춰 그래픽 화질을 자동으로 올리거나 낮춰주는 컨트롤러 */
export class AdaptiveSceneQualityController {
  private readonly frameSamples: number[] = []
  private readonly getLevel: () => SceneQualityLevel
  private readonly getMode: () => SceneQualityMode
  private readonly onLevelChange: (level: SceneQualityLevel, frameP95Ms: number) => void
  private animationFrameId = 0
  private cooldownUntil = 0
  private fastWindowCount = 0
  private lastFrameAt = 0
  private windowStartedAt = 0

  constructor(options: AdaptiveSceneQualityOptions) {
    this.getLevel = options.getLevel
    this.getMode = options.getMode
    this.onLevelChange = options.onLevelChange
  }

  /** 프레임 타임 모니터링 루프를 시작합니다. */
  start() {
    if (this.animationFrameId || typeof requestAnimationFrame === 'undefined') return

    this.animationFrameId = requestAnimationFrame(this.handleFrame)
  }

  /** 모니터링 루프를 중단하고 수집 버퍼를 초기화합니다. */
  stop() {
    if (this.animationFrameId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.animationFrameId = 0
    this.resetSamples()
  }

  /** 프레임 렌더 타임을 기록하고, 5초 주기가 도래했을 때 성능 평가를 수행합니다. */
  addFrame(timestamp: number) {
    if (!this.windowStartedAt) {
      this.windowStartedAt = timestamp
      this.lastFrameAt = timestamp
      return
    }

    // 직전 프레임과의 시간 차(Delta)를 기록
    this.frameSamples.push(timestamp - this.lastFrameAt)
    this.lastFrameAt = timestamp

    // 5초 샘플링 윈도우가 채워지지 않았으면 계속 수집
    if (timestamp - this.windowStartedAt < QUALITY_SAMPLE_WINDOW_MS) return

    // 5초 누적 샘플의 P95 계산 및 품질 평가
    const frameP95Ms = percentile95(this.frameSamples)
    this.evaluateWindow(timestamp, frameP95Ms)

    // 배열을 새로 할당하지 않고 길이만 0으로 비워 GC 부하 방지
    this.frameSamples.length = 0
    this.windowStartedAt = timestamp
  }

  /** 매 화면이 그려질 때마다 프레임 타임을 기록하고 다음 화면 측정을 예약합니다. */
  private readonly handleFrame = (timestamp: number) => {
    this.addFrame(timestamp)
    this.animationFrameId = requestAnimationFrame(this.handleFrame)
  }

  /** P95 프레임 타임을 기반으로 품질 상향/하향 여부를 결정합니다. */
  private evaluateWindow(timestamp: number, frameP95Ms: number) {
    if (this.getMode() !== 'auto') {
      this.fastWindowCount = 0
      return
    }

    // 직전 품질 변경 후 쿨다운 기간(10초) 동안은 조절 유예
    if (timestamp < this.cooldownUntil) return

    const currentLevel = this.getLevel()

    // 프레임 지연이 심한 경우: 즉시 강등 (안정성 우선)
    if (frameP95Ms > QUALITY_DOWNGRADE_P95_MS && currentLevel !== 'low') {
      this.fastWindowCount = 0
      this.cooldownUntil = timestamp + QUALITY_COOLDOWN_MS
      this.onLevelChange(lowerQuality(currentLevel), frameP95Ms)
      return
    }

    // 렌더링이 매우 여유로운 경우: 3회 연속(15초) 안정적일 때만 신중하게 승격
    if (frameP95Ms < QUALITY_UPGRADE_P95_MS && currentLevel !== 'high') {
      this.fastWindowCount += 1
      if (this.fastWindowCount >= QUALITY_UPGRADE_WINDOWS) {
        this.fastWindowCount = 0
        this.cooldownUntil = timestamp + QUALITY_COOLDOWN_MS
        this.onLevelChange(higherQuality(currentLevel), frameP95Ms)
      }
      return
    }

    // 경계 구간(25ms ~ 40ms)인 경우 승격 카운트 리셋
    this.fastWindowCount = 0
  }

  /** 모니터링을 멈추거나 다시 시작할 때 기록해 둔 프레임 측정값들을 깨끗이 비웁니다. */
  private resetSamples() {
    this.frameSamples.length = 0
    this.fastWindowCount = 0
    this.lastFrameAt = 0
    this.windowStartedAt = 0
  }
}
