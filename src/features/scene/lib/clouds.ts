import { Cartesian2, Cartesian3, CloudCollection, Color, CumulusCloud, Math as CesiumMath, Viewer } from 'cesium'
import { CLOUD_LOD } from '../model/scene.constants'
import type { SceneLocation, SceneQualityProfile, SceneWeatherState, SkyPhase } from '../model/scene.types'
import { clampToRange, clampToUnitInterval } from './math'
import { SCENE_QUALITY_PROFILES } from './sceneQuality'
import { getSkyPhase } from './sky'
import { getWeatherTint } from './weather'

/** 구름 덩어리를 자연스럽게 원형으로 고르게 분산시키기 위한 황금각(약 137.5도) */
const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5))

/** GC 방지용 내부 전용 SkyPhase 버퍼 */
const cloudSkyPhaseScratch: SkyPhase = {
  dawn: 0,
  daylight: 0,
  sunset: 0,
  night: 0,
  horizonGlow: 0,
}

/**
 * Cesium CloudCollection의 생성, 동적 갱신, 해제를 관리하는 컨트롤러 클래스.
 * 운량이 낮을 때는 컬렉션을 완전히 제거하여 WebGL 셰이더 및 VRAM 부하를 최소화합니다.
 */
export class CloudController {
  private collection: CloudCollection | null = null
  private readonly getViewer: () => Viewer | null
  private readonly getState: () => SceneWeatherState
  private readonly getLocation: () => SceneLocation
  private readonly cloudColor = new Color()
  private readonly noiseOffset = new Cartesian3()
  private quality = SCENE_QUALITY_PROFILES.high
  private locationKey = ''

  constructor(getViewer: () => Viewer | null, getState: () => SceneWeatherState, getLocation: () => SceneLocation) {
    this.getViewer = getViewer
    this.getState = getState
    this.getLocation = getLocation
  }

  /** 그래픽 품질 프로필을 갱신합니다. (최대 렌더 구름 수 조절) */
  setQuality(quality: SceneQualityProfile) {
    this.quality = quality
  }

  /** 날씨 상태 및 카메라 고도에 맞춰 구름의 수, 색조, 밝기, 노이즈를 갱신합니다. */
  update() {
    const viewer = this.getViewer()
    if (!viewer) return

    const location = this.getLocation()
    const nextLocationKey = `${location.lat}:${location.lng}`
    if (this.collection && this.locationKey !== nextLocationKey) {
      this.dispose()
    }

    const state = this.getState()
    const cover = clampToRange(state.cloudCover, 0, 100)

    // 운량이 최소 기준 미만이면 컬렉션을 비워 WebGL 리소스 절약
    if (cover < CLOUD_LOD.minimumCover) {
      this.dispose()
      viewer.scene.requestRender()
      return
    }

    this.ensureCollection()
    if (!this.collection) return

    // 하늘 시간대 및 날씨 기반 구름 파라미터 연산
    const sky = getSkyPhase(state.time, cloudSkyPhaseScratch)
    const desiredClouds = Math.min(
      this.quality.maxClouds,
      Math.round(CesiumMath.lerp(4, CLOUD_LOD.maxClouds, cover / 100)),
    )
    const brightness = CesiumMath.lerp(0.38, 0.92, sky.daylight) - clampToUnitInterval(state.precipitation / 14) * 0.16
    const alpha = CesiumMath.lerp(0.36, 0.86, cover / 100)
    const tint = getWeatherTint(state)

    // 일출/일몰 시간대 구름 밑단 노을빛 합성
    const twilightWarmth = clampToUnitInterval((sky.dawn + sky.sunset) * cover * 0.012)
    const cloudRed = CesiumMath.lerp(tint.red, 1.0, twilightWarmth * 0.52)
    const cloudGreen = CesiumMath.lerp(tint.green, 0.62, twilightWarmth * 0.42)
    const cloudBlue = CesiumMath.lerp(tint.blue, 0.56, twilightWarmth * 0.36)

    this.collection.show = desiredClouds > 0

    // 날씨 상태와 시간에 따라 노이즈 오프셋을 이동시켜 구름 형상의 유동적 변화 표현
    Cartesian3.fromElements(cover * 0.012, state.time * 0.018, state.aqi * 0.002, this.noiseOffset)
    this.collection.noiseOffset = this.noiseOffset

    // 공용 색상 버퍼 갱신
    this.cloudColor.red = cloudRed
    this.cloudColor.green = cloudGreen
    this.cloudColor.blue = cloudBlue
    this.cloudColor.alpha = alpha

    // 루프 전 카메라 고도 캐싱 (루프 내 매번 인스턴스화 방지)
    const cameraHeight = viewer.camera.positionCartographic.height
    const isHighAltitude = cameraHeight > 5500

    // 개별 구름 LOD 및 속성 갱신
    for (let index = 0; index < this.collection.length; index += 1) {
      const cloud: CumulusCloud = this.collection.get(index)
      // 높은 고도에서는 일부 구름을 숨겨 멀리서 과밀하게 겹쳐 보이는 것을 줄입니다.
      const lodHidden = isHighAltitude && index % 2 === 1
      cloud.show = index < desiredClouds && !lodHidden
      cloud.brightness = clampToRange(brightness, 0.26, 0.95)
      cloud.color = this.cloudColor
      cloud.slice = 0.38 + ((index * 19) % 24) / 100
    }

    viewer.scene.requestRender()
  }

  /** 구름 컬렉션을 씬에서 완전히 제거하고 메모리를 해제합니다. */
  dispose() {
    const viewer = this.getViewer()
    if (!viewer || !this.collection) {
      this.collection = null
      return
    }

    viewer.scene.primitives.remove(this.collection)
    this.collection = null
  }

  /** 구름 컬렉션이 없으면 새로 생성하고 LOD 최대치만큼 초기 인스턴스를 미리 배치합니다. */
  private ensureCollection() {
    const viewer = this.getViewer()
    if (!viewer || this.collection) return

    const clouds = viewer.scene.primitives.add(
      new CloudCollection({
        show: true,
        noiseDetail: 16,
      }),
    ) as CloudCollection | null
    if (!clouds) return

    clouds.noiseOffset = new Cartesian3(0.4, 0.2, 0.6)
    this.collection = clouds
    const location = this.getLocation()
    this.locationKey = `${location.lat}:${location.lng}`

    // 해바라기 씨앗 형태의 페르마 나선(황금각) 분포로 현재 좌표 상공에 구름을 자연스럽게 배치
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

  /** 황금각과 반경을 이용해 인덱스별 구름의 3D 월드 좌표(위도, 경도, 고도)를 계산합니다. */
  private getCloudPosition(index: number) {
    const angle = index * GOLDEN_ANGLE_RADIANS
    const radius = Math.sqrt((index + 0.5) / CLOUD_LOD.maxClouds)
    const location = this.getLocation()
    const longitude = location.lng + Math.cos(angle) * radius * CLOUD_LOD.longitudeSpan
    const latitude = location.lat + Math.sin(angle) * radius * CLOUD_LOD.latitudeSpan
    const altitude = CLOUD_LOD.altitude + ((index * 179) % 620)

    return Cartesian3.fromDegrees(longitude, latitude, altitude)
  }
}
