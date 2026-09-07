import { PostProcessStage, PostProcessStageSampleMode, Viewer } from 'cesium'
import { WEATHER_POST_PROCESS_STAGE_NAME } from '../model/scene.constants'
import type { SceneQualityProfile, SceneWeatherState, SkyPhase } from '../model/scene.types'
import { clampToUnitInterval } from './math'
import { SCENE_QUALITY_PROFILES } from './sceneQuality'
import { getSkyPhase } from './sky'
import { getPrecipitationMode } from './weather'

/** GC 방지용 내부 전용 SkyPhase 버퍼 */
const postProcessSkyPhaseScratch: SkyPhase = {
  dawn: 0,
  daylight: 0,
  sunset: 0,
  night: 0,
  horizonGlow: 0,
}

/**
 * 비, 눈, 안개 등 기상 악화 시 3D 건물과 지형 텍스처의 색조, 채도, 노출을 실시간 보정하는 후처리 컨트롤러.
 * 2D DOM 오버레이와 달리 WebGL 프래그먼트 셰이더를 통해 3D 씬 자체의 픽셀을 직접 보정합니다.
 */
export class WeatherPostProcessController {
  private stage: PostProcessStage | null = null
  private readonly getViewer: () => Viewer | null
  private readonly getState: () => SceneWeatherState
  private quality = SCENE_QUALITY_PROFILES.high

  constructor(getViewer: () => Viewer | null, getState: () => SceneWeatherState) {
    this.getViewer = getViewer
    this.getState = getState
  }

  /** 그래픽 품질 프로필을 설정합니다. (저품질 모드에서는 포스트 프로세스를 꺼서 GPU 부하 절감) */
  setQuality(quality: SceneQualityProfile) {
    this.quality = quality
  }

  /** 날씨 상태 및 퀄리티 설정에 따라 후처리 효과를 켜거나 끕니다. */
  update() {
    const viewer = this.getViewer()
    if (!viewer) return

    const mode = getPrecipitationMode(this.getState())

    // 맑은 날씨이거나 저사양 품질인 경우 스테이지를 제거해 GPU 낭비 방지
    if (!mode || !this.quality.postProcessEnabled) {
      this.dispose()
      viewer.scene.requestRender()
      return
    }

    this.ensureStage()

    if (this.stage) {
      this.stage.enabled = true
    }

    viewer.scene.requestRender()
  }

  /** 포스트 프로세스 스테이지를 씬 렌더 파이프라인에서 제거하고 메모리를 해제합니다. */
  dispose() {
    const viewer = this.getViewer()
    if (!viewer || !this.stage) {
      this.stage = null
      return
    }

    viewer.scene.postProcessStages.remove(this.stage)
    this.stage = null
  }

  /** 셰이더 스테이지가 없으면 생성하여 Cesium 파이프라인에 주입합니다. */
  private ensureStage() {
    const viewer = this.getViewer()
    if (!viewer || this.stage) return

    // uniform을 콜백 함수 형태로 전달하면 스테이지를 재생성하지 않아도 GPU가 매 프레임 최신 수치를 반영합니다.
    this.stage = viewer.scene.postProcessStages.add(
      new PostProcessStage({
        name: WEATHER_POST_PROCESS_STAGE_NAME,
        sampleMode: PostProcessStageSampleMode.LINEAR,
        fragmentShader: `
          uniform sampler2D colorTexture;
          in vec2 v_textureCoordinates;
          uniform float u_intensity;
          uniform float u_night;
          uniform float u_haze;

          void main(void) {
            vec4 color = texture(colorTexture, v_textureCoordinates);

            // 1. 사람 눈의 명도 인지 공식(Luma)으로 흑백 명도 추출
            float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

            // 2. 비와 안개 농도에 따라 채도를 깎아 차분하고 흐린 톤으로 탈색
            vec3 desaturated = mix(color.rgb, vec3(luminance), 0.22 * u_intensity + 0.12 * u_haze);

            // 3. 비가 올 때 푸르스름하고 젖은 느낌의 차가운 톤(Cool Tone) 부여
            vec3 rainCool = vec3(desaturated.r * 0.92, desaturated.g * 0.98, desaturated.b * 1.08);

            // 4. 미세먼지나 황사 시 흙빛(Warm Dust) 색감 합성
            vec3 dustWarm = mix(rainCool, vec3(0.78, 0.61, 0.34), 0.38 * u_haze);

            // 5. 날씨 악화 및 야간 시간대에 따른 밝기(노출) 감쇄
            float exposure = 1.0 - (0.18 * u_intensity + 0.08 * u_night + 0.07 * u_haze);
            
            out_FragColor = vec4(dustWarm * exposure, color.a);
          }
        `,
        uniforms: {
          u_intensity: () => clampToUnitInterval(this.getState().precipitation / 12),
          u_night: () => 1 - getSkyPhase(this.getState().time, postProcessSkyPhaseScratch).daylight,
          u_haze: () => clampToUnitInterval((10 - this.getState().visibility) / 10 + this.getState().aqi / 240),
        },
      }),
    ) as PostProcessStage
  }
}
