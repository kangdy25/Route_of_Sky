# Cesium.js와 3D 디지털 트윈 학습 포인트

## 1. Vue와 Cesium의 역할 분리

이 프로젝트에서 Vue는 대시보드 UI와 반응형 상태를 담당하고, Cesium은 WebGL 기반 3D 도시 장면·카메라·대기 효과를 렌더링합니다.

`src/features/scene/components/SceneCanvas.vue`는 두 영역을 연결하는 컴포넌트입니다. 컴포넌트 안에 모든 3D 로직을 넣지 않고, 시간·카메라·구름·비와 눈·후처리·품질 제어를 각각 lib 파일로 분리했습니다.

```text
Vue weather props
  → SceneCanvas sceneState
     → Cesium time / atmosphere / clouds / canvas weather / post-process
```

## 2. Cesium Viewer 생성

`SceneCanvas.vue`의 `onMounted()`는 다음 순서로 실행됩니다.

1. DOM의 `cesiumContainer`를 얻습니다.
2. `new Viewer(...)`로 Cesium Viewer를 생성합니다.
3. `configureViewerScene()`으로 배경, 태양, 달, 안개, 카메라 입력을 설정합니다.
4. `setInitialLocationView()`로 선택 지역을 바라보게 합니다.
5. 품질 프로필과 현재 날씨 상태를 적용합니다.
6. Cesium ion 토큰이 있으면 Google Photorealistic 3D Tiles를 비동기로 불러옵니다.

`onBeforeUnmount()`에서는 requestAnimationFrame, 타이머, 카메라 tween, cloud collection, post-process stage를 해제하고 `viewer.destroy()`를 호출합니다. WebGL 자원을 명시적으로 정리하는 중요한 패턴입니다.

## 3. 날씨 상태를 3D 장면 상태로 정규화

`SceneCanvas.vue`의 `sceneState`는 다음 값을 하나의 `SceneWeatherState`로 묶습니다.

- `time`
- `cloudCover`
- `precipitation`
- `aqi`
- `visibility`
- `temperature`
- `windSpeed`, `windDirectionDegrees`
- `humidity`

props가 변하면 `watch`가 갱신을 감지합니다. 갱신은 `requestAnimationFrame` 안에서 한 번에 처리하므로 여러 수치가 동시에 바뀌어도 Cesium API 호출을 무분별하게 반복하지 않습니다.

## 4. 시간과 태양

`src/features/scene/lib/cesiumScene.ts`의 `applySceneTime()`은 선택 지역의 UTC offset과 선택 시간을 바탕으로 Cesium `clock.currentTime`을 설정합니다.

`src/features/scene/lib/sky.ts`는 시간에서 낮, 새벽, 해질녘, 밤의 비율을 계산합니다. 이 값은 다음 효과에 공유됩니다.

- Cesium 태양과 달의 표현
- 안개 밝기와 하늘 대기색
- DOM 태양 glow 위치와 투명도
- 구름의 밝기와 노을 색감

시간 슬라이더는 실제 시간을 계속 흐르게 하는 시계가 아니라, 사용자가 고른 로컬 시각에 장면을 고정해 미리 보는 시뮬레이션 도구입니다.

## 5. 지역 선택과 카메라

지역 목록은 `src/features/scene/model/scene.constants.ts`의 `WORLD_LOCATIONS`에 있습니다. 지역마다 ID, 국가·도시명, 랜드마크, 위도·경도, UTC offset을 가집니다.

`DashboardPage.vue`는 지역 변경 시 `SceneCanvas`의 `flyToLocation()`을 호출합니다. `CameraFlyToController`는 `src/features/scene/lib/cesiumScene.ts`에 있으며, Cesium의 카메라 위치와 heading/pitch를 GSAP으로 보간합니다.

카메라 이동 시작·완료 이벤트는 대시보드 UI를 살짝 흐리게 하는 효과에도 사용됩니다.

## 6. 날씨 수치가 시각 효과로 바뀌는 과정

### 구름

`src/features/scene/lib/clouds.ts`의 `CloudController`는 Cesium `CloudCollection`을 관리합니다.

- 운량이 낮으면 collection을 제거해 WebGL 자원을 아낍니다.
- 운량이 높을수록 필요한 구름 수를 늘립니다.
- 품질 모드에 따라 최대 구름 수를 제한합니다.
- 시간·강수량·AQI로 구름 밝기와 색을 바꿉니다.
- 선택 지역이 바뀌면 기존 구름 collection을 해제하고 새 위치에 생성합니다.

### 비, 눈, 번개

`src/features/scene/lib/weather.ts`는 강수량과 온도에서 비/눈을 결정합니다.

```text
강수량이 임계값 이하 → 효과 없음
강수량이 있고 온도 ≤ 0 → 눈
강수량이 있고 온도 > 0 → 비
```

폭풍은 강수량만으로 판단하지 않습니다. 비 상태에서 강수량, 운량, 습도를 함께 사용합니다. 눈보라도 강설량뿐 아니라 풍속과 습도를 함께 고려합니다.

`src/features/scene/lib/screenWeather.ts`는 화면 전체의 비·눈·번개를 별도 2D canvas에 그립니다. 풍속·풍향은 입자의 이동 방향에 반영됩니다. 화면 밖으로 나간 입자는 새로 만들기보다 재사용해 GC 부담을 줄입니다.

### 안개, AQI, 가시거리

`applyAtmosphereToScene()`은 `visibility`, `aqi`, 강수량, 눈보라 강도를 이용해 Cesium fog density를 계산합니다.

- 가시거리가 짧을수록 안개 밀도가 커집니다.
- AQI가 높을수록 대기 색조와 흐림이 강해집니다.
- 비·눈보라는 추가 haze를 만듭니다.
- 시간에 따라 태양 조명 강도와 달 표시 여부가 바뀝니다.

### 3D 장면 후처리

`src/features/scene/lib/weatherPostProcess.ts`는 비·눈이 있을 때 Cesium post-process stage를 추가합니다. 이 셰이더는 3D Tiles 최종 프레임의 채도와 노출, 색온도를 조절합니다. 따라서 캔버스 입자와 별개로 도시 장면 자체도 비·눈 분위기에 맞게 바뀝니다.

## 7. 성능과 품질 모드

`src/features/scene/lib/sceneQuality.ts`에는 세 가지 품질 프로필이 있습니다.

| 모드 | resolutionScale | 날씨 FPS | 최대 구름 | 후처리 |
| --- | ---: | ---: | ---: | --- |
| High | 1.0 | 30 | 34 | 사용 |
| Medium | 0.85 | 24 | 22 | 사용 |
| Low | 0.7 | 20 | 12 | 미사용 |

Auto 모드는 기기 메모리와 논리 CPU 수를 보고 시작 품질을 결정합니다. 이후 5초 창에서 frame time p95를 계산해 40ms보다 느리면 품질을 내리고, 25ms보다 빠른 창이 세 번 이어지면 품질을 올립니다. 품질을 바꾼 뒤 10초 cooldown을 둡니다.

`p95`는 프레임의 95%가 이 시간 안에 끝났다는 뜻입니다. 평균 FPS보다 순간 끊김을 더 잘 포착하기 때문에 체감 성능을 보호하는 데 적합합니다.

## 설명 연습

> Vue는 사용자 입력과 공유 상태를 선언적으로 관리하고, SceneCanvas는 그 상태를 Cesium의 명령형 API에 전달합니다. 구름·입자·후처리·품질 제어를 독립 모듈로 나눠 3D 렌더링 로직이 UI 컴포넌트에 섞이지 않도록 했습니다.
