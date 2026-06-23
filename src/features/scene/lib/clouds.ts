import {
  Cartesian2,
  Cartesian3,
  CloudCollection,
  Color,
  CumulusCloud,
  Math as CesiumMath,
  Viewer,
} from 'cesium'

import { CLOUD_LOD, SEOUL_JAMSIL_VIEW } from '../model/scene.constants'
import type { SceneWeatherState } from '../model/scene.types'
import { clampToRange, clampToUnitInterval } from './math'
import { getSkyPhase } from './sky'
import { getWeatherTint } from './weather'

const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5))

// Cesium CloudCollection의 생성, 갱신, 해제를 한곳에서 관리합니다.
// 운량이 낮을 때는 primitive를 제거해 불필요한 WebGL 리소스를 남기지 않습니다.
export class CloudController {
  private collection: CloudCollection | null = null
  private readonly getViewer: () => Viewer | null
  private readonly getState: () => SceneWeatherState

  constructor(getViewer: () => Viewer | null, getState: () => SceneWeatherState) {
    this.getViewer = getViewer
    this.getState = getState
  }

  update() {
    const viewer = this.getViewer()
    if (!viewer) return

    const state = this.getState()
    const cover = clampToRange(state.cloudCover, 0, 100)
    if (cover < CLOUD_LOD.minimumCover) {
      this.dispose()
      viewer.scene.requestRender()
      return
    }

    this.ensureCollection()
    if (!this.collection) return

    const sky = getSkyPhase(state.time)
    const desiredClouds = Math.round(CesiumMath.lerp(4, CLOUD_LOD.maxClouds, cover / 100))
    const brightness =
      CesiumMath.lerp(0.38, 0.92, sky.daylight) -
      clampToUnitInterval(state.precipitation / 14) * 0.16
    const alpha = CesiumMath.lerp(0.36, 0.86, cover / 100)
    const tint = getWeatherTint(state)
    const twilightWarmth = clampToUnitInterval((sky.dawn + sky.dusk) * cover * 0.012)
    const cloudRed = CesiumMath.lerp(tint.red, 1.0, twilightWarmth * 0.52)
    const cloudGreen = CesiumMath.lerp(tint.green, 0.62, twilightWarmth * 0.42)
    const cloudBlue = CesiumMath.lerp(tint.blue, 0.56, twilightWarmth * 0.36)

    this.collection.show = desiredClouds > 0
    // noiseOffset을 날씨 상태와 시간에 묶어 구름이 고정된 텍스처처럼 보이지 않게 합니다.
    this.collection.noiseOffset = new Cartesian3(
      cover * 0.012,
      state.time * 0.018,
      state.aqi * 0.002,
    )

    for (let index = 0; index < this.collection.length; index += 1) {
      const cloud: CumulusCloud = this.collection.get(index)
      // 높은 고도에서는 일부 구름을 숨겨 멀리서 과밀하게 겹쳐 보이는 것을 줄입니다.
      const lodDistance = viewer.camera.positionCartographic.height > 5500 && index % 2 === 1
      cloud.show = index < desiredClouds && !lodDistance
      cloud.brightness = clampToRange(brightness, 0.26, 0.95)
      cloud.color = new Color(cloudRed, cloudGreen, cloudBlue, alpha)
      cloud.slice = 0.38 + ((index * 19) % 24) / 100
    }

    viewer.scene.requestRender()
  }

  dispose() {
    const viewer = this.getViewer()
    if (!viewer || !this.collection) {
      this.collection = null
      return
    }

    viewer.scene.primitives.remove(this.collection)
    this.collection = null
  }

  private ensureCollection() {
    const viewer = this.getViewer()
    if (!viewer || this.collection) return

    const clouds = viewer.scene.primitives.add(
      new CloudCollection({
        show: true,
        noiseDetail: 16,
      }),
    ) as CloudCollection
    clouds.noiseOffset = new Cartesian3(0.4, 0.2, 0.6)
    this.collection = clouds

    // 황금각 기반 분포로 잠실 주변에 구름을 균일하게 흩뿌립니다.
    for (let index = 0; index < CLOUD_LOD.maxClouds; index += 1) {
      const width = 520 + ((index * 97) % 520)
      const height = 260 + ((index * 53) % 280)
      const depth = 220 + ((index * 41) % 220)

      clouds.add({
        position: this.getCloudPosition(index),
        // scale은 화면 billboard 크기, maximumSize는 내부 볼륨 샘플링 범위를 결정합니다.
        scale: new Cartesian2(width, height),
        maximumSize: new Cartesian3(width * 0.92, height * 0.78, depth),
        slice: 0.44 + ((index * 17) % 18) / 100,
        brightness: 0.78,
        color: Color.WHITE.withAlpha(0.72),
      })
    }
  }

  private getCloudPosition(index: number) {
    const angle = index * GOLDEN_ANGLE_RADIANS
    const radius = Math.sqrt((index + 0.5) / CLOUD_LOD.maxClouds)
    const longitude =
      SEOUL_JAMSIL_VIEW.longitude + Math.cos(angle) * radius * CLOUD_LOD.longitudeSpan
    const latitude = SEOUL_JAMSIL_VIEW.latitude + Math.sin(angle) * radius * CLOUD_LOD.latitudeSpan
    const altitude = CLOUD_LOD.altitude + ((index * 179) % 620)

    return Cartesian3.fromDegrees(longitude, latitude, altitude)
  }
}
