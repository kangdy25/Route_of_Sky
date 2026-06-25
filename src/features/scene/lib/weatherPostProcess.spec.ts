import { describe, expect, it, vi } from 'vitest'
import type { SceneWeatherState } from '../model/scene.types'
import { WEATHER_POST_PROCESS_STAGE_NAME } from '../model/scene.constants'
import { WeatherPostProcessController } from './weatherPostProcess'

const baseState: SceneWeatherState = {
  time: 16.5,
  cloudCover: 35,
  precipitation: 0,
  aqi: 45,
  visibility: 15,
  temperature: 24.5,
  windSpeed: 5,
  windDirectionDegrees: 225,
  humidity: 62,
}

function createViewer() {
  const addedStages: unknown[] = []
  return {
    addedStages,
    viewer: {
      scene: {
        requestRender: vi.fn(),
        postProcessStages: {
          add: vi.fn((stage) => {
            addedStages.push(stage)
            return stage
          }),
          remove: vi.fn(),
        },
      },
    },
  }
}

describe('날씨 후처리 컨트롤러', () => {
  it('강수가 없으면 stage를 만들지 않고 렌더만 요청해야 한다', () => {
    const { viewer } = createViewer()
    const controller = new WeatherPostProcessController(
      () => viewer as never,
      () => baseState,
    )

    controller.update()

    expect(viewer.scene.postProcessStages.add).not.toHaveBeenCalled()
    expect(viewer.scene.requestRender).toHaveBeenCalled()
  })

  it('viewer가 없으면 post-process 갱신을 건너뛰어야 한다', () => {
    const controller = new WeatherPostProcessController(
      () => null,
      () => baseState,
    )

    expect(() => controller.update()).not.toThrow()
  })

  it('stage 생성이 실패해도 렌더 요청은 유지해야 한다', () => {
    const { viewer } = createViewer()
    viewer.scene.postProcessStages.add.mockReturnValueOnce(null)
    const controller = new WeatherPostProcessController(
      () => viewer as never,
      () => ({ ...baseState, precipitation: 4 }),
    )

    controller.update()

    expect(viewer.scene.requestRender).toHaveBeenCalled()
  })

  it('비가 오면 post-process stage를 만들고 활성화해야 한다', () => {
    const { viewer, addedStages } = createViewer()
    const state = { ...baseState, precipitation: 4, visibility: 6, aqi: 120 }
    const controller = new WeatherPostProcessController(
      () => viewer as never,
      () => state,
    )

    controller.update()

    const stage = addedStages[0] as {
      enabled: boolean
      name: string
      uniforms: Record<string, () => number>
    }
    expect(stage.name).toBe(WEATHER_POST_PROCESS_STAGE_NAME)
    expect(stage.enabled).toBe(true)
    expect(stage.uniforms.u_intensity()).toBeCloseTo(4 / 12)
    expect(stage.uniforms.u_night()).toBeGreaterThanOrEqual(0)
    expect(stage.uniforms.u_haze()).toBeGreaterThan(0)
  })

  it('이미 stage가 있으면 재사용해야 한다', () => {
    const { viewer } = createViewer()
    const controller = new WeatherPostProcessController(
      () => viewer as never,
      () => ({ ...baseState, precipitation: 4 }),
    )

    controller.update()
    controller.update()

    expect(viewer.scene.postProcessStages.add).toHaveBeenCalledTimes(1)
  })

  it('dispose는 stage를 제거하고 viewer가 없거나 stage가 없을 때도 안전해야 한다', () => {
    const { viewer } = createViewer()
    const controller = new WeatherPostProcessController(
      () => viewer as never,
      () => ({ ...baseState, precipitation: 4 }),
    )

    controller.update()
    controller.dispose()
    controller.dispose()

    expect(viewer.scene.postProcessStages.remove).toHaveBeenCalledTimes(1)

    const detachedController = new WeatherPostProcessController(
      () => null,
      () => baseState,
    )
    expect(() => detachedController.dispose()).not.toThrow()
  })
})
