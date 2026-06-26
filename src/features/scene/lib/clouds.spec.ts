import { CloudCollection } from 'cesium'
import { describe, expect, it, vi } from 'vitest'
import type { SceneWeatherState } from '../model/scene.types'
import { CLOUD_LOD, WORLD_LOCATIONS } from '../model/scene.constants'
import { CloudController } from './clouds'

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

function createViewer(height = 1750) {
  const primitives = {
    collection: null as CloudCollection | null,
    add: vi.fn((collection: CloudCollection) => {
      primitives.collection = collection
      return collection
    }),
    remove: vi.fn(),
  }

  return {
    primitives,
    viewer: {
      camera: {
        positionCartographic: { height },
      },
      scene: {
        primitives,
        requestRender: vi.fn(),
      },
    },
  }
}

describe('구름 컨트롤러', () => {
  it('운량이 낮으면 collection을 만들지 않고 렌더만 요청해야 한다', () => {
    const { viewer } = createViewer()
    const controller = new CloudController(
      () => viewer as never,
      () => ({ ...baseState, cloudCover: CLOUD_LOD.minimumCover - 1 }),
      () => WORLD_LOCATIONS[1],
    )

    controller.update()

    expect(viewer.scene.primitives.add).not.toHaveBeenCalled()
    expect(viewer.scene.requestRender).toHaveBeenCalled()
  })

  it('운량이 있으면 구름 collection을 만들고 각 구름 상태를 갱신해야 한다', () => {
    const { viewer, primitives } = createViewer()
    const controller = new CloudController(
      () => viewer as never,
      () => ({ ...baseState, cloudCover: 100, aqi: 120 }),
      () => WORLD_LOCATIONS[1],
    )

    controller.update()

    expect(primitives.add).toHaveBeenCalledTimes(1)
    expect(primitives.collection?.length).toBe(CLOUD_LOD.maxClouds)
    expect(primitives.collection?.show).toBe(true)
    expect(primitives.collection?.get(0).show).toBe(true)
    expect(primitives.collection?.get(0).brightness).toBeGreaterThan(0)
    expect(viewer.scene.requestRender).toHaveBeenCalled()
  })

  it('viewer가 없으면 구름 갱신을 건너뛰어야 한다', () => {
    const controller = new CloudController(
      () => null,
      () => ({ ...baseState, cloudCover: 100 }),
      () => WORLD_LOCATIONS[1],
    )

    expect(() => controller.update()).not.toThrow()
  })

  it('이미 collection이 있으면 새 collection을 만들지 않아야 한다', () => {
    const { primitives, viewer } = createViewer()
    const controller = new CloudController(
      () => viewer as never,
      () => ({ ...baseState, cloudCover: 100 }),
      () => WORLD_LOCATIONS[1],
    )

    controller.update()
    controller.update()

    expect(primitives.add).toHaveBeenCalledTimes(1)
  })

  it('지역이 바뀌면 기존 구름 collection을 새 위치 기준으로 다시 만들어야 한다', () => {
    const { primitives, viewer } = createViewer()
    let location = WORLD_LOCATIONS[1]
    const controller = new CloudController(
      () => viewer as never,
      () => ({ ...baseState, cloudCover: 100 }),
      () => location,
    )

    controller.update()
    location = WORLD_LOCATIONS[3]
    controller.update()

    expect(primitives.remove).toHaveBeenCalledTimes(1)
    expect(primitives.add).toHaveBeenCalledTimes(2)
  })

  it('primitive 추가가 실패해도 안전하게 빠져나와야 한다', () => {
    const { primitives, viewer } = createViewer()
    primitives.add.mockReturnValueOnce(null as never)
    const controller = new CloudController(
      () => viewer as never,
      () => ({ ...baseState, cloudCover: 100 }),
      () => WORLD_LOCATIONS[1],
    )

    expect(() => controller.update()).not.toThrow()
  })

  it('높은 고도에서는 일부 구름을 숨겨야 한다', () => {
    const { primitives, viewer } = createViewer(6000)
    const controller = new CloudController(
      () => viewer as never,
      () => ({ ...baseState, cloudCover: 100 }),
      () => WORLD_LOCATIONS[1],
    )

    controller.update()

    expect(primitives.collection?.get(1).show).toBe(false)
    expect(primitives.collection?.get(2).show).toBe(true)
  })

  it('dispose는 collection을 제거하고 viewer가 없을 때도 안전해야 한다', () => {
    const { primitives, viewer } = createViewer()
    const controller = new CloudController(
      () => viewer as never,
      () => ({ ...baseState, cloudCover: 100 }),
      () => WORLD_LOCATIONS[1],
    )

    controller.update()
    controller.dispose()
    controller.dispose()

    expect(primitives.remove).toHaveBeenCalledTimes(1)

    const detachedController = new CloudController(
      () => null,
      () => baseState,
      () => WORLD_LOCATIONS[1],
    )
    expect(() => detachedController.dispose()).not.toThrow()
  })
})
