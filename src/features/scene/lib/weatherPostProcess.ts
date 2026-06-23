import { PostProcessStage, PostProcessStageSampleMode, Viewer } from 'cesium'

import { WEATHER_POST_PROCESS_STAGE_NAME } from '../model/scene.constants'
import type { SceneWeatherState } from '../model/scene.types'
import { clampToUnitInterval } from './math'
import { getSkyPhase } from './sky'
import { getPrecipitationMode } from './weather'

// 비/눈이 있을 때만 Cesium 최종 프레임에 색보정 post-process를 얹습니다.
// DOM 오버레이와 달리 3D Tiles 자체의 노출, 채도, 색온도를 함께 바꾸는 역할입니다.
export class WeatherPostProcessController {
  private stage: PostProcessStage | null = null
  private readonly getViewer: () => Viewer | null
  private readonly getState: () => SceneWeatherState

  constructor(getViewer: () => Viewer | null, getState: () => SceneWeatherState) {
    this.getViewer = getViewer
    this.getState = getState
  }

  update() {
    const viewer = this.getViewer()
    if (!viewer) return

    const mode = getPrecipitationMode(this.getState())
    if (!mode) {
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

  dispose() {
    const viewer = this.getViewer()
    if (!viewer || !this.stage) {
      this.stage = null
      return
    }

    viewer.scene.postProcessStages.remove(this.stage)
    this.stage = null
  }

  private ensureStage() {
    const viewer = this.getViewer()
    if (!viewer || this.stage) return

    // uniform을 함수로 두면 stage를 재생성하지 않아도 최신 날씨 상태가 매 프레임 반영됩니다.
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
            float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            vec3 desaturated = mix(color.rgb, vec3(luminance), 0.22 * u_intensity + 0.12 * u_haze);
            vec3 rainCool = vec3(desaturated.r * 0.92, desaturated.g * 0.98, desaturated.b * 1.08);
            vec3 dustWarm = mix(rainCool, vec3(0.78, 0.61, 0.34), 0.38 * u_haze);
            float exposure = 1.0 - (0.18 * u_intensity + 0.08 * u_night + 0.07 * u_haze);
            out_FragColor = vec4(dustWarm * exposure, color.a);
          }
        `,
        uniforms: {
          u_intensity: () => clampToUnitInterval(this.getState().precipitation / 12),
          u_night: () => 1 - getSkyPhase(this.getState().time).daylight,
          u_haze: () =>
            clampToUnitInterval((10 - this.getState().visibility) / 10 + this.getState().aqi / 240),
        },
      }),
    ) as PostProcessStage
  }
}
