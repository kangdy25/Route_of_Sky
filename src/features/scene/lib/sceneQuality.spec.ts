import { describe, expect, it, vi } from 'vitest'
import type { SceneQualityLevel, SceneQualityMode } from '../model/scene.types'
import {
  AdaptiveSceneQualityController,
  getRecommendedAutoQuality,
  SCENE_QUALITY_PROFILES,
} from './sceneQuality'

function feedWindow(
  controller: AdaptiveSceneQualityController,
  startAt: number,
  frameInterval: number,
) {
  let timestamp = startAt
  const endAt = startAt + 5_100
  while (timestamp <= endAt) {
    controller.addFrame(timestamp)
    timestamp += frameInterval
  }
  return timestamp
}

describe('적응형 scene 품질', () => {
  it('High, Medium, Low 프로필에 계획된 렌더링 예산을 제공해야 한다', () => {
    expect(SCENE_QUALITY_PROFILES.high).toMatchObject({
      resolutionScale: 1,
      weatherFps: 30,
      particleMultiplier: 1,
      maxClouds: 34,
      postProcessEnabled: true,
    })
    expect(SCENE_QUALITY_PROFILES.medium).toMatchObject({
      resolutionScale: 0.85,
      weatherFps: 24,
      particleMultiplier: 0.7,
      maxClouds: 22,
    })
    expect(SCENE_QUALITY_PROFILES.low).toMatchObject({
      resolutionScale: 0.7,
      weatherFps: 20,
      particleMultiplier: 0.45,
      maxClouds: 12,
      postProcessEnabled: false,
      simplifiedSnow: true,
    })
  })

  it('CPU나 메모리 힌트가 낮은 장치는 Medium으로 시작해야 한다', () => {
    expect(getRecommendedAutoQuality({ hardwareConcurrency: 4, deviceMemory: 8 })).toBe('medium')
    expect(getRecommendedAutoQuality({ hardwareConcurrency: 8, deviceMemory: 4 })).toBe('medium')
    expect(getRecommendedAutoQuality({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe('high')
  })

  it('5초 p95 프레임 시간이 40ms를 넘으면 한 단계 낮춰야 한다', () => {
    let level: SceneQualityLevel = 'high'
    const onLevelChange = vi.fn((nextLevel: SceneQualityLevel) => {
      level = nextLevel
    })
    const controller = new AdaptiveSceneQualityController({
      getLevel: () => level,
      getMode: () => 'auto',
      onLevelChange,
    })

    feedWindow(controller, 1, 50)

    expect(onLevelChange).toHaveBeenCalledWith('medium', 50)
  })

  it('25ms 미만이 3개 window 연속 유지될 때만 품질을 높여야 한다', () => {
    let level: SceneQualityLevel = 'medium'
    const onLevelChange = vi.fn((nextLevel: SceneQualityLevel) => {
      level = nextLevel
    })
    const controller = new AdaptiveSceneQualityController({
      getLevel: () => level,
      getMode: () => 'auto',
      onLevelChange,
    })

    let timestamp = feedWindow(controller, 1, 16)
    timestamp = feedWindow(controller, timestamp, 16)
    expect(onLevelChange).not.toHaveBeenCalled()
    feedWindow(controller, timestamp, 16)

    expect(onLevelChange).toHaveBeenCalledWith('high', 16)
  })

  it('수동 품질 모드에서는 프레임 상태로 단계를 바꾸지 않아야 한다', () => {
    const mode: SceneQualityMode = 'high'
    const onLevelChange = vi.fn()
    const controller = new AdaptiveSceneQualityController({
      getLevel: () => 'high',
      getMode: () => mode,
      onLevelChange,
    })

    feedWindow(controller, 1, 80)

    expect(onLevelChange).not.toHaveBeenCalled()
  })
})
