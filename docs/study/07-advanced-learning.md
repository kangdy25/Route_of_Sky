# 심화 학습: Vue.js, Cesium.js, 3D 디지털 트윈

이 문서는 현재 프로젝트를 이해한 다음 이어서 공부할 주제와, 코드에서 출발해 확인할 수 있는 질문을 정리합니다. 구현 변경을 지시하는 문서가 아니라 학습 경로입니다.

## 1. Vue 반응성과 외부 렌더러 연결

### 현재 코드에서 출발하기

`SceneCanvas.vue`는 Vue props를 `sceneState` computed로 만들고, watch로 변화를 감지해 Cesium API를 호출합니다. Vue는 선언형 UI 라이브러리이고 Cesium은 명령형 WebGL 엔진이므로, 둘을 연결하는 adapter 계층이 필요합니다.

### 더 공부할 주제

- Vue watcher flush timing: `pre`, `post`, `sync`의 차이
- `watch`와 `watchEffect`의 적합한 사용처
- requestAnimationFrame batching이 렌더링 횟수를 줄이는 원리
- 컴포넌트 unmount와 외부 라이브러리 dispose 패턴
- `shallowRef`가 대형 외부 객체에 유용한 이유

### 확인 질문

`SceneCanvas`에서 props가 여러 개 동시에 변할 때 requestAnimationFrame으로 묶지 않으면 Cesium `requestRender()` 호출은 어떻게 늘어날까요?

## 2. 상태 모델링과 도메인 경계

### 현재 코드에서 출발하기

`WeatherState`는 외부 WeatherAPI 응답과 독립된 내부 모델입니다. `weatherApi.ts`가 외부 필드명과 단위를 변환하고, UI와 씬은 내부 타입만 사용합니다.

### 더 공부할 주제

- DTO(Data Transfer Object)와 도메인 모델의 차이
- API 응답 검증 라이브러리(Zod 등)의 역할
- Pinia setup store와 option store 비교
- `storeToRefs`가 필요한 이유
- 서버 상태와 클라이언트 UI 상태의 구분

### 확인 질문

WeatherAPI가 `wind_kph` 필드명을 변경한다면, 왜 화면 컴포넌트가 아니라 `weatherApi.ts` 중심으로 수정하는 것이 유리할까요?

## 3. 3D 좌표, 카메라, 시간

### 현재 코드에서 출발하기

`WORLD_LOCATIONS`에는 위도·경도와 UTC offset이 있으며, `applySceneTime()`은 지역 시간을 Cesium JulianDate로 바꿉니다. 카메라는 longitude/latitude/height와 heading/pitch/roll로 지정됩니다.

### 더 공부할 주제

- WGS84, 위도·경도·고도 좌표계
- Cartesian3와 cartographic 좌표의 차이
- heading, pitch, roll의 의미
- UTC와 지역 시간, 일광 절약 시간(DST) 처리
- Cesium clock, JulianDate, 태양·달 위치의 관계

### 확인 질문

현재 지역 상수의 `utcOffsetHours`가 고정값일 때, 계절에 따라 DST가 적용되는 도시에서 어떤 한계가 생길까요?

## 4. WebGL 렌더링 계층

### 현재 코드에서 출발하기

프로젝트는 날씨 효과를 하나의 기술로 구현하지 않습니다.

| 렌더링 계층 | 실제 구현 |
| --- | --- |
| 3D 공간 | Cesium 3D Tiles, CloudCollection, fog, light |
| 화면 공간 2D | `ScreenWeatherRenderer`의 canvas 비·눈·번개 |
| 최종 이미지 | `WeatherPostProcessController`의 fragment shader |
| DOM UI | Vue 대시보드와 CSS overlay |

### 더 공부할 주제

- WebGL render pipeline
- scene space와 screen space의 차이
- fragment shader와 uniform
- devicePixelRatio와 canvas 해상도
- alpha blending, depth test, post-processing

### 확인 질문

비·눈을 2D canvas로 그리는 방식과 Cesium particle system으로만 구현하는 방식의 장단점은 무엇일까요?

## 5. 성능 측정과 적응형 품질

### 현재 코드에서 출발하기

`sceneQuality.ts`는 frame time p95를 기준으로 품질을 조절합니다. Low 품질에서는 해상도 배율, 날씨 FPS, 구름 수를 낮추고 post-process도 끕니다.

### 더 공부할 주제

- FPS와 frame time의 관계: 16.7ms ≈ 60 FPS
- 평균, p50, p95, p99의 차이
- GPU 병목과 CPU 병목 구별하기
- requestRenderMode가 지속 렌더링과 다른 점
- object pooling과 GC가 애니메이션에 미치는 영향
- Chrome Performance trace, WebGL profiler 사용법

### 확인 질문

평균 FPS가 60이지만 1초에 한 번 100ms 프레임이 생긴다면, 사용자는 왜 끊김을 느낄 수 있을까요?

## 6. 디지털 트윈 개념 확장

현재 프로젝트는 선택 도시의 3D Tiles와 외부 날씨 데이터를 연결해 환경을 시각화합니다. 이를 디지털 트윈 관점에서 보면 “현실의 일부 상태를 디지털 공간에 대응시키는 시각화”입니다.

더 완전한 디지털 트윈으로 확장할 때 고려할 개념은 다음과 같습니다.

- 실시간 센서와 메시지 스트림: WebSocket, MQTT, Server-Sent Events
- 시간 축 데이터: 과거 관측값, 예보, 재생 기능
- 공간 데이터: GeoJSON, 3D Tiles metadata, GIS 좌표계
- 시뮬레이션: 날씨·교통·에너지 모델의 입력과 결과
- 데이터 품질: 결측값, 지연, 신뢰도, 출처 표시
- 사용자 상호작용: 지점 선택, 레이어 토글, 비교 모드

## 7. 추천 실습 순서

1. `WeatherState`의 모든 필드가 UI와 3D 효과 중 어디에 쓰이는지 추적합니다.
2. Playwright의 `weather-integration.spec.ts`를 읽고 지역 변경·캐시·실패가 어떻게 검증되는지 확인합니다.
3. `SceneCanvas.vue`의 `applySceneState()`에서 각 상태 필드가 어떤 모듈을 다시 실행하는지 표로 정리합니다.
4. `sceneQuality.ts`의 p95 계산을 작은 숫자 배열로 손으로 계산해 봅니다.
5. `weatherPostProcess.ts`의 shader uniform이 최신 상태를 매 프레임 읽는 이유를 조사합니다.
6. Cesium 공식 문서에서 Viewer, Camera, Clock, 3D Tiles, PostProcessStage를 차례로 학습합니다.

## 심화 설명 연습

> 이 프로젝트는 Vue의 선언형 상태 관리와 Cesium의 명령형 WebGL 렌더링 사이에 SceneCanvas라는 연결 계층을 둡니다. 외부 API 데이터는 내부 WeatherState로 정규화하고, 그 상태를 3D 공간 효과, 화면 공간 효과, 최종 프레임 후처리로 분리해 적용합니다. 또한 frame time p95 기반의 적응형 품질을 통해 시각 품질과 성능의 균형을 관리합니다.
