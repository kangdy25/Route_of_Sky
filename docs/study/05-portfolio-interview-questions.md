# 포트폴리오·면접 예상 질문

아래 답변은 프로젝트의 실제 파일과 구현을 근거로 말할 수 있는 핵심 포인트입니다. 그대로 외우기보다 자신의 언어로 바꾸어 설명해 보세요.

## Vue.js

### Q1. Composition API를 선택한 이유는 무엇인가요?

`DashboardPage.vue`, `SceneCanvas.vue`처럼 상태·생명주기·watch·이벤트가 함께 있는 화면에서 관련 로직을 가까이 둘 수 있기 때문입니다. TypeScript 타입과도 자연스럽게 결합됩니다.

### Q2. 컴포넌트 내부 상태와 Pinia 상태는 어떻게 구분했나요?

`selectedLocation`, 설정 패널 열림 여부처럼 특정 화면에서만 필요한 값은 `ref`로 관리했습니다. 날씨처럼 대시보드 카드와 Cesium 3D 씬이 함께 사용하는 값은 `weather.store.ts`의 Pinia store에 뒀습니다.

### Q3. props, emits, v-model을 어떤 기준으로 사용했나요?

읽기 전용 데이터는 props로 전달하고, 클릭·선택처럼 사용자의 의도는 emits로 상위에 알렸습니다. 시간과 날씨 수치처럼 양방향 편집이 필요한 값은 `defineModel`과 `v-model`로 연결했습니다. 여러 날씨 값을 묶어 애니메이션으로 적용하는 프리셋은 `previewWeather` 이벤트를 사용했습니다.

### Q4. API 요청 중 지역을 다시 바꾸면 어떻게 처리하나요?

store에서 `AbortController`로 기존 요청을 취소합니다. 또한 현재 활성 좌표와 응답 좌표를 비교해 이전 응답이 새 지역의 화면을 덮어쓰지 않게 했습니다.

## Cesium.js와 3D 디지털 트윈

### Q5. Vue와 Cesium의 역할을 어떻게 나눴나요?

Vue는 UI와 반응형 상태를 관리하고, Cesium은 3D Tiles, 카메라, 안개, 조명, 구름을 렌더링합니다. `SceneCanvas.vue`가 Vue 상태를 Cesium API에 전달하는 연결 계층입니다.

### Q6. 지역 전환 카메라는 어떻게 구현했나요?

`DashboardPage`가 `SceneCanvas` 템플릿 ref의 `flyToLocation()`을 호출합니다. `CameraFlyToController`는 GSAP으로 Cesium 카메라의 위치와 방향을 보간해 부드럽게 이동시킵니다.

### Q7. 날씨 데이터를 어떻게 시각 효과로 바꾸나요?

강수량과 온도로 비·눈을 먼저 구분하고, 운량·습도까지 결합해 폭풍 강도를 계산합니다. 운량은 Cesium CloudCollection, 비·눈·번개는 2D canvas, fog와 조명은 Cesium scene, 색감은 post-process stage로 나누어 적용합니다.

### Q8. 3D Tiles 토큰이 없으면 앱은 어떻게 되나요?

Cesium Viewer와 대시보드는 동작하지만 Google Photorealistic 3D Tiles 로드를 건너뜁니다. UI는 토큰 설정 안내를 보여 줍니다.

## GSAP

### Q9. GSAP은 어떤 문제를 해결하나요?

날씨 수치나 시간 값이 갑자기 바뀔 때 시각적 단절이 생기는 문제를 해결합니다. store가 목표 상태를 갖고 GSAP이 중간 값을 갱신해 대시보드와 씬이 부드럽게 전환됩니다. 카메라 이동과 패널 전환에도 사용됩니다.

### Q10. 사용자 입력과 애니메이션의 충돌은 어떻게 막나요?

슬라이더를 직접 조작할 때 `cancelTransitions()`를 호출해 진행 중 tween을 제거합니다. 사용자의 즉시 입력이 자동 전환보다 우선합니다. 모션 감소 환경에서는 tween을 사용하지 않습니다.

## API와 캐시

### Q11. API 프록시를 둔 이유는 무엇인가요?

WeatherAPI 키를 브라우저 번들에 노출하지 않기 위해서입니다. 추가로 서버에서 허용 좌표, HTTP 메서드, timeout, 오류 형식을 통제할 수 있습니다.

### Q12. 캐시 전략은 무엇인가요?

클라이언트 localStorage에 5분 TTL 캐시를 두어 동일 좌표의 재방문 요청을 줄였습니다. 서버리스 응답에는 CDN 캐시 헤더도 적용했습니다. 네트워크 실패 때는 만료 캐시라도 보여 주어 빈 화면 대신 마지막 데이터를 유지합니다.

### Q13. 이 프로젝트에 데이터베이스가 있나요?

현재 저장소에는 데이터베이스와 Django 모델이 없습니다. 날씨 원본은 외부 WeatherAPI에서 가져오고, 영속 데이터는 브라우저 localStorage의 사용자 설정·캐시입니다.

## 프로젝트 구조와 성능

### Q14. `pages`, `widgets`, `features`, `shared` 분리 기준은 무엇인가요?

`pages`는 화면 조립, `widgets`는 여러 기능을 조합한 UI 블록, `features`는 날씨·3D 씬 같은 도메인 기능, `shared`는 재사용 공통 코드라는 책임 기준으로 나눴습니다.

### Q15. Auto 품질은 어떻게 동작하나요?

기기 코어 수와 메모리로 초기 품질을 정하고, 5초 창의 frame time p95를 관찰합니다. p95가 느리면 resolution scale, 날씨 FPS, 구름 수, 후처리를 낮추고, 충분히 빠른 상태가 연속되면 다시 올립니다.

### Q16. 평균 FPS 대신 p95를 보는 이유는 무엇인가요?

평균 FPS가 좋아도 일부 프레임이 길면 사용자는 끊김을 느낍니다. p95는 느린 프레임 구간을 관찰해 체감 품질을 더 잘 반영합니다.

## 1분 프로젝트 소개 예시

> Route of Sky는 Vue 3와 Pinia로 날씨·UI 상태를 관리하고, Cesium.js가 이를 3D 도시와 시간·대기·강수 효과로 표현하는 디지털 트윈 시각화 플랫폼입니다. 외부 WeatherAPI는 서버리스 프록시로 감싸 API 키를 보호했고, localStorage와 CDN 캐시로 반복 요청을 줄였습니다. GSAP은 날씨 전환과 카메라 이동을 부드럽게 만들며, Auto 품질 모드는 frame time p95를 기준으로 저사양 기기의 렌더링 부담을 조절합니다.
