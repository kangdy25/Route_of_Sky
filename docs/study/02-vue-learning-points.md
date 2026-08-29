# Vue.js 학습 포인트

## 1. Composition API와 `<script setup>`

Route of Sky의 컴포넌트는 대부분 `<script setup lang="ts">`를 사용합니다. Options API의 `data`, `methods`, `mounted` 대신 상태와 로직을 함수 단위로 작성하는 Vue 3 방식입니다.

대표 파일은 `src/pages/DashboardPage.vue`입니다. 이 파일에서 지역 선택, 품질 모드, 카메라 전환 여부처럼 화면을 조립하는 상태를 선언하고, 하위 컴포넌트와 Pinia store를 연결합니다.

## 2. 앱 마운트

`src/main.ts`의 핵심 흐름입니다.

```ts
createApp(App).use(createPinia()).mount('#app')
```

- `createApp(App)`: `App.vue`를 루트로 하는 앱을 생성합니다.
- `use(createPinia())`: 전역 상태 저장소를 플러그인으로 등록합니다.
- `mount('#app')`: `index.html`의 `#app`에 렌더링합니다.

`src/App.vue`는 현재 `DashboardPage.vue`를 렌더링합니다. 라우팅 라이브러리가 없으므로 URL별 페이지 이동보다는 한 화면을 구성하는 구조입니다.

## 3. `ref`, `computed`, `watch`, 생명주기

| 개념 | 실제 예 | 의미 |
| --- | --- | --- |
| `ref` | `selectedLocation`, `qualityMode` in `DashboardPage.vue` | 값이 바뀌면 사용하는 화면을 갱신하는 반응형 상태 |
| `computed` | `sceneState` in `SceneCanvas.vue` | 여러 props에서 계산한 파생 상태 |
| `watch` | `qualityMode` 저장, Cesium 상태 갱신 | 특정 반응형 값이 바뀔 때 실행할 부수 효과 |
| `onMounted` | 초기 날씨 요청, Viewer 생성 | 컴포넌트가 DOM에 연결된 뒤 실행 |
| `onBeforeUnmount` | Cesium과 타이머 해제 | 컴포넌트 제거 전 리소스 정리 |

`SceneCanvas.vue`는 weather props를 `sceneState`라는 `computed` 객체로 묶습니다. 이어서 `watch`가 날씨·시간·지역 변경을 감지하고 `requestAnimationFrame`으로 Cesium 장면 갱신을 예약합니다.

## 4. 부모-자식 컴포넌트 통신

데이터 흐름은 아래 원칙을 따릅니다.

```text
부모 → 자식: props
자식 → 부모: emits
```

`AppHeader.vue`는 지역 목록과 선택된 ID를 props로 받습니다. 사용자가 select를 변경하면 `selectLocation` 이벤트를 emit합니다. `DashboardOverlay.vue`가 이를 받고 다시 상위로 전달하며, 최종적으로 `DashboardPage.vue`의 `selectLocation()`이 실행됩니다.

이 방식은 자식 컴포넌트가 부모의 내부 상태를 직접 수정하지 않도록 합니다. 자식은 “지역을 선택했다”는 의도만 알리고, 실제 상태 변경·API 요청·카메라 이동은 상위 페이지가 결정합니다.

## 5. `v-model`과 `defineModel`

`DashboardOverlay.vue`와 `SettingsPanel.vue`는 Vue 3의 `defineModel`을 사용합니다.

```ts
const time = defineModel<number>('time', { required: true })
const precipitation = defineModel<number>('precipitation', { required: true })
```

부모인 `DashboardPage.vue`에서는 다음처럼 연결합니다.

```vue
<DashboardOverlay
  v-model:time="time"
  v-model:precipitation="precipitation"
/>
```

이 연결 덕분에 시간 패널이나 설정 패널에서 값을 바꾸면 부모의 해당 ref도 갱신됩니다. 여러 입력 값의 양방향 바인딩에 적합합니다. 반면 날씨 프리셋처럼 여러 값을 한 번에 바꾸고 애니메이션까지 적용해야 하는 경우에는 `previewWeather` emit을 사용합니다.

## 6. Pinia 상태 관리

`src/features/weather/model/weather.store.ts`의 `useWeatherStore()`가 날씨의 단일 진실 공급원입니다.

포함하는 상태는 다음과 같습니다.

- 날씨: 시간, 온도, 최저·최고 온도, 습도, 풍속·풍향, AQI, 운량, 강수량, 가시거리
- 요청 UI: `isLoading`, `errorMessage`, `lastUpdatedAt`, `dataSource`
- 계측용 정보: 캐시 적중·실패 횟수, 네트워크 요청 수, 강제 갱신 수

`DashboardPage.vue`는 `storeToRefs(weatherStore)`로 상태를 꺼냅니다. 이 함수는 구조 분해를 해도 반응성을 유지하게 해 줍니다. 같은 상태가 대시보드 카드와 `SceneCanvas` props에 전달되므로 두 화면이 자동으로 동기화됩니다.

## 7. localStorage의 세 가지 용도

| 데이터 | 파일 | 이유 |
| --- | --- | --- |
| 선택 지역 ID | `DashboardPage.vue` | 새로고침 뒤에도 마지막 도시 복원 |
| 씬 품질 모드 | `DashboardPage.vue` | 사용자의 High/Medium/Low/Auto 선택 복원 |
| 날씨 응답 | `weather.cache.ts` | 5분 이내 재요청 방지 및 빠른 표시 |

`weather.cache.ts`는 저장하기 전에 응답의 모든 필드가 유한 숫자인지 확인하고, 잘못된 JSON 또는 오래된 형식은 안전하게 삭제합니다.

## 8. API 요청과 오류 상태

`weather.store.ts`의 `loadCurrentWeather()` 흐름입니다.

1. 좌표를 키로 localStorage 캐시를 읽습니다.
2. 캐시가 5분 이내이고 강제 새로고침이 아니면 즉시 적용합니다.
3. 아니면 `fetchCurrentWeather()`를 호출합니다.
4. 성공하면 내부 `WeatherState`를 적용하고 캐시를 저장합니다.
5. 실패했지만 오래된 캐시가 있으면 `stale-cache`로 표시합니다.
6. 캐시도 없으면 오류 메시지를 표시합니다.

동시에 다른 지역으로 바꾸면 이전 요청을 `AbortController`로 취소합니다. 오래 걸린 이전 응답이 현재 지역의 화면을 덮어쓰지 않게 하는 장치입니다.

## 9. GSAP과 Vue 상태

GSAP은 별도의 화면 상태를 갖지 않습니다. Pinia 또는 `ref` 값이 목표 상태이고, GSAP은 그 값까지 변화하는 중간 값을 만들어 냅니다.

- `weather.store.ts`: 날씨 변화 0.9초, 시간 변화 0.7초 tween
- `cesiumScene.ts`: 카메라 위치와 방향 보간
- `DashboardOverlay.vue`: 패널 등장·숨김
- `SettingsPanel.vue`: 설정 드로어 열기·닫기

사용자가 직접 범위 입력을 조작하면 `cancelTransitions()`를 호출해 자동 tween을 중단합니다. `prefersReducedMotion()`이 참인 환경에서는 애니메이션을 생략하고 즉시 값을 반영합니다.

## 스스로 확인할 질문

1. 왜 `selectedLocation`은 페이지의 `ref`이고 날씨는 Pinia일까요?
2. `v-model`만 쓰지 않고 `previewWeather` 이벤트를 둔 이유는 무엇일까요?
3. API 요청 실패 시 왜 기본값 대신 stale cache를 유지할까요?
4. `onBeforeUnmount`에서 Cesium Viewer를 destroy하지 않으면 어떤 문제가 생길까요?
