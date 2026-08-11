import type { SceneQualityLevel, SceneQualityMode, SceneQualityProfile } from '../model/scene.types'

export const QUALITY_SAMPLE_WINDOW_MS = 5_000
export const QUALITY_COOLDOWN_MS = 10_000
export const QUALITY_DOWNGRADE_P95_MS = 40
export const QUALITY_UPGRADE_P95_MS = 25
export const QUALITY_UPGRADE_WINDOWS = 3

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

export function getRecommendedAutoQuality(
  device: { deviceMemory?: number; hardwareConcurrency?: number } = typeof navigator === 'undefined'
    ? {}
    : navigator,
): SceneQualityLevel {
  const hardwareConcurrency = device.hardwareConcurrency ?? 8
  const deviceMemory = device.deviceMemory ?? 8

  return hardwareConcurrency <= 4 || deviceMemory <= 4 ? 'medium' : 'high'
}

function percentile95(values: number[]) {
  if (!values.length) return 0

  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
}

function lowerQuality(level: SceneQualityLevel): SceneQualityLevel {
  if (level === 'high') return 'medium'
  return 'low'
}

function higherQuality(level: SceneQualityLevel): SceneQualityLevel {
  if (level === 'low') return 'medium'
  return 'high'
}

interface AdaptiveSceneQualityOptions {
  getLevel: () => SceneQualityLevel
  getMode: () => SceneQualityMode
  onLevelChange: (level: SceneQualityLevel, frameP95Ms: number) => void
}

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

  start() {
    if (this.animationFrameId || typeof requestAnimationFrame === 'undefined') return

    this.animationFrameId = requestAnimationFrame(this.handleFrame)
  }

  stop() {
    if (this.animationFrameId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.animationFrameId = 0
    this.resetSamples()
  }

  addFrame(timestamp: number) {
    if (!this.windowStartedAt) {
      this.windowStartedAt = timestamp
      this.lastFrameAt = timestamp
      return
    }

    this.frameSamples.push(timestamp - this.lastFrameAt)
    this.lastFrameAt = timestamp

    if (timestamp - this.windowStartedAt < QUALITY_SAMPLE_WINDOW_MS) return

    const frameP95Ms = percentile95(this.frameSamples)
    this.evaluateWindow(timestamp, frameP95Ms)
    this.frameSamples.length = 0
    this.windowStartedAt = timestamp
  }

  private readonly handleFrame = (timestamp: number) => {
    this.addFrame(timestamp)
    this.animationFrameId = requestAnimationFrame(this.handleFrame)
  }

  private evaluateWindow(timestamp: number, frameP95Ms: number) {
    if (this.getMode() !== 'auto') {
      this.fastWindowCount = 0
      return
    }

    if (timestamp < this.cooldownUntil) return

    const currentLevel = this.getLevel()
    if (frameP95Ms > QUALITY_DOWNGRADE_P95_MS && currentLevel !== 'low') {
      this.fastWindowCount = 0
      this.cooldownUntil = timestamp + QUALITY_COOLDOWN_MS
      this.onLevelChange(lowerQuality(currentLevel), frameP95Ms)
      return
    }

    if (frameP95Ms < QUALITY_UPGRADE_P95_MS && currentLevel !== 'high') {
      this.fastWindowCount += 1
      if (this.fastWindowCount >= QUALITY_UPGRADE_WINDOWS) {
        this.fastWindowCount = 0
        this.cooldownUntil = timestamp + QUALITY_COOLDOWN_MS
        this.onLevelChange(higherQuality(currentLevel), frameP95Ms)
      }
      return
    }

    this.fastWindowCount = 0
  }

  private resetSamples() {
    this.frameSamples.length = 0
    this.fastWindowCount = 0
    this.lastFrameAt = 0
    this.windowStartedAt = 0
  }
}
