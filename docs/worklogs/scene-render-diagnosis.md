# 작업 일지: scene-render-diagnosis

## 기본 정보

- 날짜: 2026-09-05
- 브랜치: `practice/my-own-practice`
- 관련 PR: 없음
- 목표: SceneCanvas의 프레임 경고와 지역 전환 뒤 3D 화면이 비어 보이는 현상을 분리해 진단하고, 렌더 요청과 카메라 조망 연결을 복구한다.

## 기준선과 가설

- 기준선: 개발자 도구에서 `requestAnimationFrame` 핸들러 장시간 경고가 보였고, 지역 전환 뒤 3D Tiles가 늦게 보이거나 빈 배경처럼 보였다.
- 가설: `requestRenderMode`를 사용하는 Viewer에서 GSAP 카메라 이동 중 타일 요청을 중단하면 새 시점의 타일 선택이 늦어질 수 있다. 또한 도시별 `cameraView`가 정의되어 있지만 페이지 전환 경로에서는 사용되지 않았다.
- 성공 기준: 타입 검사를 통과하고, 지역 변경 뒤 카메라 이동 완료 시 한 번 더 렌더 요청하며, 도시별 조망 설정이 실제 이동에 전달된다.

## 변경 내용

- `src/features/scene/components/SceneCanvas.vue`
  - `cullRequestsWhileMoving`을 `false`로 복원해 카메라 이동 중 새 위치 타일 요청을 막지 않도록 했다.
  - `skipLevelOfDetail`, `loadSiblings`, foveated/점진 해상도 옵션을 이전의 점진 LOD 조합으로 복원했다. 이 조합은 빈 화면에서 고해상도 타일을 기다리지 않고, 먼저 표시 가능한 부모 타일과 주변 타일을 보여 준다.
- `src/features/scene/lib/cesiumScene.ts`
  - GSAP 카메라 이동 완료 시 `scene.requestRender()`를 호출해 `requestRenderMode` 환경에서도 최종 시점의 타일 선택이 이어지게 했다.
  - 시간대 상태의 기존 `daylight`, `sunset` 소비처와 새 시간대 모델의 호환 계약을 유지했다.
- `src/features/scene/lib/sky.ts`
  - 시간 프리셋 주변 거리만으로 조도를 0으로 만들던 계산을, 일출부터 해질녘까지 부드럽게 이어지는 조도 계산으로 보정했다. 따라서 저녁 시간에도 3D Tiles 조명이 갑자기 꺼지지 않는다.
  - 하늘 광량 계약을 `daylight`, `dawn`, `sunset`, `night`, `horizonGlow`로 정리하고, 기존 중복 별칭을 제거해 모든 렌더링 소비처를 같은 용어로 맞췄다.
- `src/pages/DashboardPage.vue`
  - 지역 변경 시 `location.cameraView`를 우선 전달하고, 없는 경우에만 기존 공통 카메라 값을 사용하게 했다.
- `src/features/scene/model/scene.constants.ts`
  - 예루살렘 카메라 고도를 380m에서 1500m로 올렸다. 기존 값은 현지 지표 고도보다 낮아 카메라가 지형/3D Tiles 내부에서 시작했다.

## 검증

- 실행 명령:
  - `pnpm exec vue-tsc --noEmit -p tsconfig.app.json --pretty false`
  - `git diff --check`
  - `pnpm test:unit --run src/features/scene/components/SceneCanvas.spec.ts src/pages/DashboardPage.spec.ts`
- 테스트 결과:
  - 타입 검사와 diff 공백 검사는 통과했다.
  - 단위 테스트는 애플리케이션 코드와 무관하게 로컬 Tailwind native binary(`@tailwindcss/oxide`)를 Vite가 불러오지 못해 시작 단계에서 중단됐다.
  - 로컬 브라우저에서 초기 로드와 서울/뉴욕 지역 전환을 확인했다. 현재 시각(19시대)과 정오 모두에서 3D Tiles가 보이는 것을 확인했고, 콘솔 오류는 없었다.
  - 아직 방문하지 않은 도쿄로 이동한 뒤, 날씨 가림을 제외한 상태에서 도시 타일이 단계적으로 표시되는 것을 확인했다. 이 검사는 브라우저 캐시를 강제로 비운 공식 성능 측정은 아니다.
  - 예루살렘은 맑은 낮 상태에서도 기존 380m 카메라에서 검은 화면으로 재현됐고, 1500m로 보정한 뒤 정상 타일 표시를 확인했다.
- Before → After:
  - 지역 전환: 공통 뉴욕 카메라 값 사용 → 도시별 `cameraView` 사용.
  - 카메라 완료 직후: 별도 렌더 요청 없음 → 최종 타일 선택용 `requestRender()` 1회 보장.
  - 저녁 시간: `daylight = 0`으로 급격히 전환 → 해질녘까지 연속적으로 감쇠.

## 판단과 롤백

- 판정: 코드 연결 문제는 수정했다. 다만 실제 Google 3D Tiles 도착 시간은 외부 네트워크와 Cesium ion 상태에 영향을 받으므로 성능 개선 수치로 기록하지 않는다.
- 위험: Google 3D Tiles가 메모리 예산보다 많은 타일을 요구한다는 Cesium 경고가 남아 있다. 이번 작업에서 캐시 예산이나 시각 품질은 변경하지 않았다.
- 참고: 운량 98% 상태에서는 `CloudCollection`이 의도적으로 도시를 상당 부분 가린다. 또한 보정 전에는 저녁 시간의 조명 계산까지 겹쳐 빈 화면처럼 보였다. 운량이 낮은 현재 시각과 정오에서 타일이 보이는 것을 확인해 두 원인을 구분했다.
- 롤백 조건: 지역 전환 뒤 타일 요청 또는 카메라 이동이 회귀하면 이번의 렌더 요청/카메라 연결 변경을 개별적으로 되돌리고 Cesium trace를 다시 수집한다.
- 다음 작업: Tailwind native 의존성을 정상화한 뒤 SceneCanvas 및 DashboardPage 단위 테스트를 재실행하고, 실제 GPU 환경에서 지역 전환 시나리오를 측정한다.
