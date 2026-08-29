# 대표 API·상태 흐름

## 공통 상태 흐름

```text
사용자 입력
→ Vue 컴포넌트 이벤트 또는 v-model
→ DashboardPage / Pinia store
→ Dashboard UI와 SceneCanvas props 갱신
→ Cesium 효과 갱신
```

날씨 API가 포함된 경우에는 중간에 서버리스 프록시와 외부 WeatherAPI가 추가됩니다.

## A. 지역 변경 후 날씨 갱신

### 단계별 흐름

1. 사용자가 `AppHeader.vue`의 지역 `<select>`를 변경합니다.
2. `AppHeader`가 `selectLocation(locationId)`을 emit합니다.
3. `DashboardOverlay.vue`가 이 이벤트를 상위로 전달합니다.
4. `DashboardPage.vue`의 `selectLocation()`이 `WORLD_LOCATIONS`에서 새 지역을 찾습니다.
5. `selectedLocation` ref를 갱신하고 선택한 ID를 localStorage에 저장합니다.
6. `flyToSelectedLocation()`이 `SceneCanvas`의 공개 메서드를 호출해 카메라를 이동합니다.
7. `loadSelectedLocationWeather()`가 `weatherStore.loadCurrentWeather("위도,경도")`를 호출합니다.
8. store는 5분 이내 localStorage 캐시를 먼저 확인합니다.
9. 캐시가 없거나 강제 갱신이면 `weatherApi.ts`가 `/api/weather?q=...`를 요청합니다.
10. Vercel의 `api/weather.js`가 입력을 검증한 뒤 서버 전용 API 키로 WeatherAPI를 호출합니다.
11. `weatherApi.ts`가 외부 응답을 프로젝트 `WeatherState`로 변환합니다.
12. Pinia store가 상태와 캐시를 갱신합니다.
13. 대시보드 카드와 `SceneCanvas`가 같은 반응형 값을 받아 함께 갱신됩니다.

### 관련 파일

| 파일 | 역할 |
| --- | --- |
| `widgets/dashboard/AppHeader.vue` | 지역 선택 UI와 이벤트 emit |
| `pages/DashboardPage.vue` | 선택 지역 변경, 저장, 카메라 이동, store 호출 |
| `features/scene/model/scene.constants.ts` | `WORLD_LOCATIONS` 좌표 목록 |
| `features/weather/model/weather.store.ts` | 캐시·요청·상태 갱신 |
| `features/weather/api/weatherApi.ts` | 요청 URL 생성과 응답 변환 |
| `api/weather.js` | 서버리스 프록시 |

### 오류와 캐시

- 신선한 캐시: 네트워크 요청 없이 즉시 화면에 반영합니다.
- 만료 캐시 + 네트워크 성공: 새 응답으로 교체합니다.
- 만료 캐시 + 네트워크 실패: `stale-cache` 상태로 기존 값을 보여 주고 경고합니다.
- 캐시 없음 + 실패: 오류 메시지와 재시도 UI를 표시합니다.
- 빠른 지역 전환: 이전 요청을 `AbortController`로 취소합니다.

## B. 시간 슬라이더 조작

### 단계별 흐름

1. 사용자가 `TimePanel.vue`의 range input을 조작합니다.
2. `v-model.number="time"`이 컴포넌트 모델 값을 바꿉니다.
3. `DashboardOverlay`의 `v-model:time` 연결을 통해 `DashboardPage`의 `time` ref가 바뀝니다.
4. 이 ref는 `storeToRefs(weatherStore)`에서 온 Pinia 상태이므로 store의 시간도 갱신됩니다.
5. `SceneCanvas.vue`의 `time` prop이 바뀝니다.
6. `SceneCanvas`의 watch가 변경을 감지하고 다음 animation frame에 `applySceneState()`를 예약합니다.
7. `applySceneTime()`이 선택 지역의 로컬 시각을 Cesium clock에 설정합니다.
8. 하늘, 태양 glow, 달, 안개, 구름 색상과 밝기가 새 시간 기준으로 바뀝니다.
9. `TimePanel`의 형식화된 시간과 낮/밤 상태도 Vue 반응성으로 다시 렌더링됩니다.

### 직접 입력과 버튼 입력의 차이

- 슬라이더 드래그: `manualTimeInput` 이벤트를 보내 기존 GSAP 시간 tween을 취소합니다.
- 2시간 이동, 현재 시각으로 복귀 버튼: `setTime` 이벤트를 보내며 store의 `setSceneTime(..., { animate: true })`가 부드럽게 보간할 수 있습니다.

## C. 설정 패널의 날씨 프리셋

### 단계별 흐름

1. 사용자가 `SettingsPanel.vue`에서 Rain, Snow, Storm, Haze 등을 선택합니다.
2. `previewRain()`, `previewSnow()` 같은 함수가 온도·운량·강수량·풍속·습도·AQI 패치를 만듭니다.
3. `applyWeatherPreset()`이 계산한 가시거리를 포함해 `previewWeather` 이벤트를 emit합니다.
4. `DashboardOverlay.vue`가 이벤트를 `DashboardPage.vue`로 전달합니다.
5. `DashboardPage`가 `weatherStore.applyWeatherPatch($event, { animate: true })`를 호출합니다.
6. Pinia store가 GSAP tween으로 수치를 현재값에서 목표값까지 변화시킵니다.
7. 수치가 바뀔 때마다 Dashboard UI와 `SceneCanvas`가 새 props를 받습니다.
8. Cesium은 구름, fog, 색보정, 시간 효과를 갱신하고 2D canvas는 비·눈·번개 입자를 갱신합니다.

### 중요한 구분

프리셋은 서버에 날씨를 저장하는 기능이 아닙니다. 로컬 Pinia 상태를 바꾸어 3D 날씨를 즉시 미리 보는 시뮬레이터 기능입니다. 실제 날씨로 돌아가려면 SettingsPanel의 `Render Current Weather`가 강제 API 갱신을 요청합니다.

## 서버리스 API의 보호 장치

`api/weather.js`는 다음을 수행합니다.

1. GET 외 메서드를 405로 거부합니다.
2. `q` 외 쿼리 키를 400으로 거부합니다.
3. `WORLD_LOCATIONS`과 대응하는 허용 좌표 목록만 통과시킵니다.
4. `WEATHER_API_KEY`가 없으면 외부 호출 없이 503을 반환합니다.
5. 외부 요청은 8초 timeout을 둡니다.
6. 외부 서비스의 상세 오류는 숨기고 502 또는 504로 정규화합니다.
7. CDN에는 5분 캐시와 60초 stale-while-revalidate를 안내합니다.

## 개발과 배포의 차이

- 개발: `vite.config.ts`의 `/api/weather` 프록시가 WeatherAPI로 전달합니다.
- Vercel 배포: `api/weather.js`가 실제 서버리스 API endpoint입니다.

둘 다 브라우저 코드가 외부 API 키를 직접 갖지 않는다는 목표를 공유합니다.
