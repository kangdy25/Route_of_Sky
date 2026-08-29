# Route of Sky 프로젝트 구조

## 목적

Route of Sky는 Vue 3 기반의 단일 대시보드 애플리케이션으로, 실시간 날씨 상태를 Cesium 3D 도시 장면에 반영하는 3D 디지털 트윈 시각화 플랫폼입니다. 이 문서는 기능을 수정하지 않고 현재 코드의 책임 분리를 이해하기 위한 안내서입니다.

## 큰 그림

```text
Browser
  └─ Vue App + Pinia
       ├─ Dashboard UI
       ├─ Cesium 3D Scene
       └─ /api/weather
            └─ Vercel serverless function
                 └─ WeatherAPI
```

이 저장소에는 Django, 관계형 데이터베이스, `vue-router`가 없습니다. 하나의 대시보드 화면을 중심으로 동작하며, 날씨 원본은 외부 WeatherAPI에서 받고 브라우저 캐시와 CDN 캐시를 사용합니다.

## 루트 파일과 폴더

| 경로 | 역할 |
| --- | --- |
| `package.json` | Vue, Pinia, GSAP, Cesium 의존성과 실행·테스트 명령 |
| `vite.config.ts` | Vue/Vite 플러그인, `@` 별칭, 개발용 날씨 프록시 |
| `src/` | 브라우저에서 실행되는 Vue 애플리케이션 |
| `api/` | Vercel 배포 시 실행되는 서버리스 API |
| `e2e/` | Playwright 브라우저 통합 테스트 |
| `tests/` | 서버리스 API 테스트 |
| `docs/` | 성능 기록, 작업 일지, 학습 문서 |

## `src` 구조와 책임

```text
src/
├─ main.ts
├─ App.vue
├─ pages/
│  └─ DashboardPage.vue
├─ widgets/dashboard/
│  ├─ DashboardOverlay.vue
│  ├─ AppHeader.vue
│  ├─ SettingsPanel.vue
│  └─ TimePanel.vue
├─ features/
│  ├─ weather/
│  │  ├─ api/
│  │  ├─ model/
│  │  └─ lib/
│  └─ scene/
│     ├─ components/
│     ├─ model/
│     └─ lib/
└─ shared/
   ├─ config/
   ├─ lib/
   └─ ui/
```

- `pages`: 페이지 단위 조립. 현재 핵심은 `DashboardPage.vue` 하나입니다.
- `widgets/dashboard`: 여러 feature를 조합한 화면 블록입니다. 헤더, 지표, 시간 패널, 설정 드로어를 담당합니다.
- `features/weather`: 날씨라는 도메인의 타입, API 변환, Pinia 상태, 캐시를 모읍니다.
- `features/scene`: Cesium Viewer와 3D 장면의 시간·날씨·카메라·품질을 담당합니다.
- `shared`: 특정 feature에 종속되지 않는 공통 UI, 환경 변수, 성능 유틸리티를 둡니다.

## 앱 시작부터 화면 조립까지

1. `src/main.ts`가 `createApp(App)`으로 Vue 앱을 만들고 `createPinia()`를 등록합니다.
2. `src/App.vue`가 최상위 화면으로 `DashboardPage.vue`를 렌더링합니다.
3. `src/pages/DashboardPage.vue`가 날씨 Pinia store를 사용하고, `SceneCanvas`와 `DashboardOverlay`를 같은 날씨 상태에 연결합니다.
4. `DashboardOverlay`가 헤더, 지표 카드, 시간 패널, 설정 패널을 조합합니다.

```text
main.ts → App.vue → DashboardPage.vue
                         ├─ SceneCanvas.vue
                         └─ DashboardOverlay.vue
                              ├─ AppHeader.vue
                              ├─ EnvironmentPanel.vue
                              ├─ SkyPanel.vue
                              ├─ AtmospherePanel.vue
                              ├─ TimePanel.vue
                              └─ SettingsPanel.vue
```

## 날씨 기능의 파일 흐름

| 파일 | 책임 |
| --- | --- |
| `features/weather/model/weather.types.ts` | 앱 전체가 공유할 `WeatherState` 타입 |
| `features/weather/model/weather.store.ts` | Pinia 상태, 요청, 오류, 애니메이션, 캐시 사용 |
| `features/weather/api/weatherApi.ts` | 외부 응답을 내부 날씨 모델로 변환 |
| `features/weather/model/weather.cache.ts` | localStorage 5분 캐시 |
| `features/weather/model/weather.constants.ts` | API 전 기본 날씨 상태 |
| `api/weather.js` | API 키 보호와 WeatherAPI 호출을 담당하는 서버리스 함수 |

## 3D 씬 기능의 파일 흐름

| 파일 | 책임 |
| --- | --- |
| `features/scene/components/SceneCanvas.vue` | Vue props와 Cesium Viewer를 연결하는 조립자 |
| `features/scene/lib/cesiumScene.ts` | 카메라, Cesium clock, 안개·조명 설정 |
| `features/scene/lib/clouds.ts` | Cesium CloudCollection 생성·갱신·해제 |
| `features/scene/lib/screenWeather.ts` | 비·눈·번개를 2D canvas로 렌더링 |
| `features/scene/lib/weatherPostProcess.ts` | 비·눈 시 3D 프레임 색보정 셰이더 |
| `features/scene/lib/sceneQuality.ts` | High/Medium/Low/Auto 품질 제어 |
| `features/scene/model/scene.constants.ts` | 지역 좌표, 3D Tiles ID, 날씨 임계값 |

## 테스트 구조

- `src/**/*.spec.ts`: Vitest와 Vue Test Utils로 컴포넌트·store·유틸리티를 테스트합니다.
- `e2e/weather-integration.spec.ts`: 초기 날씨 요청, 지역 변경, 캐시, 실패 후 재시도를 검증합니다.
- `e2e/dashboard.spec.ts`: Cesium 캔버스와 대시보드, 품질 설정 저장·복원을 검증합니다.
- `tests/weather-api-proxy.spec.js`: 서버리스 프록시의 입력 검증, 키 보호, 오류 응답을 검증합니다.

## 구조를 설명하는 한 문장

> 페이지는 화면을 조립하고, widgets는 대시보드 UI를 구성하며, features는 날씨와 3D 씬의 도메인 로직을 담당하고, shared는 공통 코드를 제공하도록 분리했습니다.
