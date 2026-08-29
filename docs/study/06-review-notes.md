# 복습 노트

## Vue 기본 개념

| 핵심 개념 | 실제 파일 | 한 줄 설명 | 면접 표현 |
| --- | --- | --- | --- |
| `ref` | `pages/DashboardPage.vue` | 값이 바뀌면 연결된 UI가 갱신되는 상태 | “화면 범위 상태는 ref로 관리했습니다.” |
| `computed` | `scene/components/SceneCanvas.vue` | 기존 상태로부터 계산한 파생값 | “원본 값을 중복 저장하지 않고 computed로 파생 상태를 만들었습니다.” |
| `watch` | `SceneCanvas.vue` | 상태 변화 뒤 실행할 부수 효과 | “Vue 반응형 상태와 Cesium의 명령형 API를 watch로 연결했습니다.” |
| `onMounted` | `SceneCanvas.vue` | DOM에 붙은 뒤 Viewer를 생성 | “DOM ref가 준비된 뒤 WebGL Viewer를 초기화했습니다.” |
| `onBeforeUnmount` | `SceneCanvas.vue` | 화면 제거 전 리소스 정리 | “Viewer와 타이머를 해제해 WebGL 리소스 누수를 방지했습니다.” |
| props / emits | `widgets/dashboard/AppHeader.vue` | 부모 데이터 전달과 자식 의도 전달 | “단방향 데이터 흐름을 props와 emits로 유지했습니다.” |
| `defineModel` | `DashboardOverlay.vue` | 이름 있는 양방향 모델 선언 | “중첩 UI의 편집 상태는 v-model 계약으로 연결했습니다.” |

## 상태 관리와 API

| 핵심 개념 | 실제 파일 | 한 줄 설명 | 면접 표현 |
| --- | --- | --- | --- |
| Pinia | `weather/model/weather.store.ts` | 여러 컴포넌트가 공유하는 날씨 상태 | “날씨를 단일 진실 공급원으로 두어 UI와 3D 씬을 동기화했습니다.” |
| 타입 모델 | `weather/model/weather.types.ts` | 앱 내부 날씨 데이터의 계약 | “외부 API 형태와 내부 도메인 모델을 분리했습니다.” |
| API 매핑 | `weather/api/weatherApi.ts` | 외부 응답을 `WeatherState`로 변환 | “화면은 외부 API의 필드명에 직접 의존하지 않습니다.” |
| localStorage 캐시 | `weather/model/weather.cache.ts` | 5분 TTL의 브라우저 캐시 | “빠른 초기 표시와 요청 감소를 위해 클라이언트 캐시를 적용했습니다.” |
| 서버리스 프록시 | `api/weather.js` | 키 보호, 입력 검증, 오류 정규화 | “브라우저가 비밀 키를 갖지 않도록 API 호출을 서버에서 중계했습니다.” |
| AbortController | `weather/model/weather.store.ts` | 오래된 요청 취소 | “빠른 지역 전환 시 이전 응답의 화면 덮어쓰기를 막았습니다.” |

## Cesium과 3D 렌더링

| 핵심 개념 | 실제 파일 | 한 줄 설명 | 면접 표현 |
| --- | --- | --- | --- |
| Cesium Viewer | `scene/components/SceneCanvas.vue` | 3D 지도·도시 장면 렌더러 | “Vue 상태를 Cesium Viewer에 전달하는 연결 컴포넌트입니다.” |
| `SceneWeatherState` | `scene/model/scene.types.ts` | 3D 효과가 공유하는 날씨 입력 | “렌더링 모듈이 Vue props에 직접 의존하지 않도록 상태 계약을 만들었습니다.” |
| 카메라 비행 | `scene/lib/cesiumScene.ts` | 지역 전환 카메라 보간 | “GSAP으로 위치와 방향을 보간해 부드러운 전환을 만들었습니다.” |
| 구름 | `scene/lib/clouds.ts` | Cesium CloudCollection 관리 | “운량과 품질에 따라 primitive 수와 색을 제어했습니다.” |
| 비·눈·번개 | `scene/lib/screenWeather.ts` | 2D canvas 날씨 입자 | “화면 공간 효과를 별도 canvas로 분리해 렌더링 부담을 조절했습니다.” |
| 안개·대기 | `scene/lib/cesiumScene.ts` | AQI와 가시거리의 시각화 | “대기 데이터로 fog 밀도와 배경·조명을 계산했습니다.” |
| 후처리 | `scene/lib/weatherPostProcess.ts` | 3D 장면 색보정 셰이더 | “강수 시 3D Tiles의 노출과 색감을 함께 바꿨습니다.” |

## 꼭 기억할 흐름

```text
지역 선택
→ DashboardPage 상태 변경
→ Pinia 날씨 요청
→ localStorage cache 또는 /api/weather
→ WeatherState 갱신
→ 대시보드 + Cesium SceneCanvas 동시 갱신
```

```text
시간 변경
→ v-model / Pinia time 변경
→ SceneCanvas watch
→ Cesium clock 변경
→ 태양·하늘·안개·구름 갱신
```

```text
날씨 프리셋
→ SettingsPanel emit
→ Pinia applyWeatherPatch
→ GSAP tween
→ 비·눈·구름·fog·후처리 갱신
```

## 용어를 쉽게 기억하기

- **반응성**: 값이 바뀌면 그 값을 사용하는 Vue 화면도 자동으로 다시 계산되는 성질입니다.
- **단일 진실 공급원**: 같은 날씨 데이터를 여러 곳에 복사하지 않고 Pinia store 한 곳에서 관리한다는 뜻입니다.
- **명령형 API**: `viewer.camera.setView()`처럼 “지금 카메라를 이렇게 바꿔라”라고 직접 명령하는 방식입니다. Cesium이 여기에 가깝습니다.
- **선언형 UI**: `:temperature="temperature"`처럼 값이 무엇인지 선언하면 Vue가 화면을 맞추는 방식입니다.
- **프록시**: 브라우저와 외부 WeatherAPI 사이에서 요청을 중계하는 서버리스 함수입니다.
- **TTL**: 캐시가 유효하다고 보는 시간입니다. 이 프로젝트의 날씨 localStorage TTL은 5분입니다.
- **post-process**: 3D 장면이 한 번 렌더링된 뒤 최종 이미지에 적용하는 색보정입니다.
- **p95 frame time**: 느린 프레임까지 고려하는 성능 지표입니다.
