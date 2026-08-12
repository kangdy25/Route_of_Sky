# Route of Sky 성능 최적화 사례 연구 — Phase 2

## 프로젝트 맥락과 사용자 문제

Route of Sky는 Cesium 3D 도시·기상 입자·대시보드를 한 화면에 조합한다. 사용자는 첫 화면에서 UI와 3D Viewer를 기다리고, 재방문에서는 Cesium 정적 파일과 공유 미리보기 이미지를 내려받는다. 이 구조에서 “프레임이 느리다”는 단일 문제보다 **실제 GPU에서 재현 가능한 런타임 수치**, **저사양 기기 보호**, **정적 전송량**, **날씨 데이터 신선도**를 분리해 검증하는 일이 먼저였다.

Phase 1의 headless software WebGL 수치는 실제 GPU 체감과 차이가 컸다. Phase 2에서는 실제 Chrome GPU, 1365×768, 캐시 비활성화, 데스크톱·CPU ×4 각각 3회 중앙값을 공식 기준으로 정했다. GPU 모델·드라이버·위치·API 키는 저장하지 않는다.

## 병목 발견과 우선순위

| 우선순위 | 근거 | 가설 | 결정 |
| --- | --- | --- | --- |
| 1 | 원래 공유 썸네일 977,995 B, 전체 산출물 14,299,816 B | 정적 전달량은 즉시 줄이고 회귀도 막을 수 있다 | 재인코딩·immutable 캐시·CI 예산을 채택 |
| 2 | software renderer 수치가 실제 GPU보다 과도하게 느림 | 잘못된 기준선이면 최적화 우선순위도 왜곡된다 | headful 실제 GPU 측정기를 먼저 구축 |
| 3 | Cesium·강수 효과가 프레임 시간에 관여 | 초기 로딩 분리·rAF 통합이 체감을 개선할 수 있다 | 수치 유지 조건을 충족할 때만 채택 |
| 4 | 날씨 API는 지역 전환·새로고침 때 반복될 수 있음 | 5분 캐시가 네트워크와 응답 대기를 줄인다 | Phase 1의 localStorage 캐시·요청 병합을 E2E로 계속 검증 |

## 구현 선택과 트레이드오프

### 1. 실제 GPU 기준선과 개발 전용 RUM

`perf:gpu`는 headless가 아닌 Chrome을 열고 SwiftShader·llvmpipe·software renderer를 감지하면 실패한다. 공식 JSON에는 `hardwareAcceleration: true`만 남긴다. FCP/LCP, CLS, Viewer 준비, Long Task, Event Timing, 위치 전환, Rain/Storm/Snow 20초 p95, 품질 전환, API·전송량을 원본 3회와 중앙값으로 보존한다.

개발 계측은 `import.meta.env.DEV`와 `?perf=1`이 동시에 참일 때만 켜진다. `POST /api/performance`은 `VERCEL_ENV=development`인 `vercel dev`에서 허용 필드만 구조화 로그로 남기며 Preview·Production에서는 404다. 외부 분석 서비스나 원격 사용자 추적을 넣지 않은 이유는 성능 관측이 개인정보·전송 비용을 새로 만들면 안 되기 때문이다.

### 2. 초기 로딩 분리: 채택하지 않은 이유

`SceneCanvas`의 동적 import, 고정 플레이스홀더, Viewer 준비 전 마지막 위치 대기열을 구현했다. 하지만 실제 GPU 3회 중앙값에서 데스크톱 FCP/LCP는 692 → 1,044/1,060ms, Viewer 준비는 651.9 → 1,408.6ms로 악화됐다. CPU ×4 Viewer도 1,927.6 → 3,291.0ms였다. CLS는 0으로 지켰지만 “FCP/LCP 10% 개선·Viewer 악화 15% 이하”를 모두 위반해 코드를 롤백했다.

대안은 전체 Cesium 초기화를 단순히 늦추는 대신, 실제 사용자 동작·네트워크 우선순위 trace로 필요한 하위 모듈만 나누는 것이다. 이를 검증하기 전에는 bundle splitting을 성과로 내세우지 않는다.

### 3. rAF 강수 루프: 채택하지 않은 이유

강수 `setTimeout`을 rAF로 통합하고 Canvas context·비가시 탭·품질 분석을 조정했다. 그러나 데스크톱 Rain/Storm/Snow p95가 83.4/66.7/17.7 → 183.2/135.2/66.7ms로 모두 악화됐고 CPU ×4도 악화됐다. 동일 프레임 큐에서 Cesium·Canvas·측정 rAF가 경쟁했을 가능성을 남기고 코드를 롤백했다.

다음 후보인 OffscreenCanvas Worker는 호환성 테스트를 통과하고 캔버스 지배 시나리오 p95가 10% 이상 개선될 때만 유지한다. 단순히 Worker를 도입해 디버깅·브라우저 호환성 비용을 늘리지는 않는다.

### 4. 정적 전달 최적화와 재방문 캐시

공유 썸네일을 1,376×768·977,995 B에서 시각 검토 후 1,200×669·213,019 B로 재인코딩했다. **764,976 B, 78.2% 감소**이며 250 KiB 예산보다 42,981 B 작다. `/thumbnail.jpg`와 버전 고정 `/cesium/*`에는 `public, max-age=31536000, immutable`을 적용했고 Production HEAD 응답으로 확인했다.

정적 파일을 삭제하거나 근거 없이 Cesium ESM 재빌드를 시도하지 않았다. Worker·WASM·타일 경로는 남겨야 3D 기능을 보장할 수 있으며, 버전 고정 자산은 장기 캐시가 더 안전한 개선이다. 공식 GPU 측정은 HTTP 캐시를 끄므로 재방문 전송량 감소는 이 표가 아니라 헤더 정책과 별도 브라우저 재방문 검증으로 판단한다.

### 5. API 캐시와 데이터 신선도

Weather 캐시는 좌표별 localStorage 키와 5분 TTL을 사용한다. 신선한 캐시는 즉시 반영하고, 같은 요청은 합치며, 지역을 빠르게 바꾸면 이전 요청을 취소한다. “Render Current Weather”만 `force: true`로 캐시를 우회한다. 만료 캐시는 네트워크 실패 때만 복구용으로 쓰고 데이터 경과 시간을 표시한다.

최종 실제 GPU 명령은 HTTP 캐시를 끄고 Weather 응답을 고정 모킹하므로 API 요청 수가 2 → 2건인 것은 통제 조건이다. 반대로 Playwright 통합 테스트는 새로고침 후 유효 캐시에서 API를 다시 호출하지 않는 흐름과 강제 새로고침 우회를 검증한다. 이 분리는 외부 API 지연이나 네트워크 상태를 앱 성능 개선으로 잘못 해석하지 않기 위해서다.

## 최종 정량 결과

| 지표 | Before | After | 절대 차이 | 개선율 | 판정 |
| --- | ---: | ---: | ---: | ---: | --- |
| 전체 배포 산출물 | 14,299,816 B | 13,534,839 B | 764,977 B 감소 | 5.3% | 13.63 MiB 예산 통과 |
| 공유 썸네일 | 977,995 B | 213,019 B | 764,976 B 감소 | 78.2% | 250 KiB 예산 통과 |
| 데스크톱 Long Task p95 | 104.0 ms | 85.0 ms | 19.0 ms 단축 | 18.3% | 관측상 개선 |
| 데스크톱 FCP / LCP | 640.0 ms | 732.0 ms | 92.0 ms 증가 | -14.4% | 미달, 개선 주장 안 함 |
| 데스크톱 Viewer 준비 | 669.0 ms | 794.1 ms | 125.1 ms 증가 | -18.7% | 미달, 개선 주장 안 함 |
| CPU ×4 Viewer 준비 | 1,588.0 ms | 2,078.1 ms | 490.1 ms 증가 | -30.9% | 미달, 개선 주장 안 함 |
| CPU ×4 Rain / Storm / Snow p95 | 282.6 / 250.0 / 150.5 ms | 333.6 / 298.0 / 217.3 ms | 51.0 / 48.0 / 66.8 ms 증가 | -18.0 / -19.2 / -44.4% | 미달, 후보 롤백 |

전체 표와 3회 원본은 [최종 비교](final-comparison.md)에 있다. 개선율은 모든 행에서 `(Before - After) / Before × 100`으로 계산했다.

## 저사양 UX와 남은 제약

기존 High/Medium/Low 및 Auto 품질 단계는 저사양에서 무조건 화질을 유지하기보다 프레임 p95에 따라 품질을 보호하는 장치다. 그러나 Phase 2의 rAF 후보가 CPU ×4에서 목표를 만족하지 못했으므로, 그 후보를 유지해 저사양 사용자에게 비용을 전가하지 않았다.

남은 제약은 Cesium 초기화·GPU/OS 스케줄링·외부 타일 응답의 변동성이다. 다음 단계는 동일한 실제 GPU에서 Chrome trace를 수집해 Viewer 준비의 긴 작업과 Canvas·Cesium 큐 경쟁을 분리하고, 그 결과가 각 프리셋 p95 15% 개선·다른 프리셋 5% 이상 회귀 없음이라는 조건을 충족할 때만 적용하는 것이다.

## PR과 커밋

| 작업 | PR | 병합 커밋 | 결과 |
| --- | --- | --- | --- |
| 실제 GPU 기준선·개발 전용 계측 | [#22](https://github.com/kangdy25/Route_of_Sky/pull/22) | [`83de063`](https://github.com/kangdy25/Route_of_Sky/commit/83de063) | 채택 |
| 초기 로딩 분리 실험 | [#23](https://github.com/kangdy25/Route_of_Sky/pull/23) | [`d62dae3`](https://github.com/kangdy25/Route_of_Sky/commit/d62dae3) | 수치 미달, 코드 롤백 |
| rAF 렌더 루프 실험 | [#24](https://github.com/kangdy25/Route_of_Sky/pull/24) | [`6af9286`](https://github.com/kangdy25/Route_of_Sky/commit/6af9286) | 수치 미달, 코드 롤백 |
| Cesium 전달·썸네일 | [#25](https://github.com/kangdy25/Route_of_Sky/pull/25) | [`c17f6b8`](https://github.com/kangdy25/Route_of_Sky/commit/c17f6b8) | 채택 |
| 정적 성능 예산 CI | [#26](https://github.com/kangdy25/Route_of_Sky/pull/26) | [`5120dfc`](https://github.com/kangdy25/Route_of_Sky/commit/5120dfc) | 채택 |
