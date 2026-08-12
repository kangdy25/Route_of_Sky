# Phase 2 성능 최적화 작업 로그

개선율은 `(Before - After) / Before × 100`으로 계산합니다. 각 작업의 원본 3회 값과 중앙값은 `runs/`에 보존합니다.

## 2026-08-13 · 실제 GPU 기준선

- 가설: Phase 1 headless software WebGL 수치는 실제 사용자 GPU 체감보다 과도하게 느려, 절대 성능 목표와 후속 병목을 정확히 판정할 수 없다.
- 변경: 실제 Chrome GPU를 요구하는 `perf:gpu`, 실제 GPU 판정, Phase 2 JSON 형식과 비교 도구를 추가했다.
- Before: 데스크톱 중앙값 FCP/LCP 640ms, Viewer 준비 669ms, Rain/Storm/Snow p95 67.4/50.1/17.6ms, Long Task p95 104ms였다. CPU ×4에서는 FCP/LCP 940ms, Viewer 준비 1,588ms, Rain/Storm/Snow p95 282.6/250.0/150.5ms였다.
- 판단: headless software WebGL의 수백 ms~초 단위 프레임 값보다 실제 GPU가 유의미하게 빠르다. 이후 Phase 2 최적화의 공식 비교는 이 기준선만 사용한다.
- 롤백 조건: 소프트웨어 렌더러 결과가 저장되거나 개인·원시 GPU 정보가 JSON에 포함되면 측정기를 즉시 수정 또는 제거한다.

## 2026-08-13 · 개발 전용 익명 계측

- 가설: 실제 GPU 수치를 보완하는 개발 계측은 필요하지만, Preview·Production 사용자의 위치·식별자·원시 장치 정보를 수집해서는 안 된다.
- 변경: 개발 빌드의 `?perf=1`에서만 `viewer-ready`, `tiles-stable`, `quality-applied`, 날씨 cache hit/network 시간을 전송한다. `/api/performance`은 `VERCEL_ENV=development`인 `vercel dev`에서만 허용 목록 기반 구조화 로그를 출력하고, 그 외 환경은 404로 차단한다.
- Before → After: 프로덕션 앱 JS gzip은 86,752 → 86,752 bytes(0 bytes, 0.0%)였고 리소스 전송량도 2,853,295 → 2,853,295 bytes(0 bytes, 0.0%)로 동일했다. 데스크톱 FCP/LCP 640 → 740ms와 저사양 FCP/LCP 940 → 1,096ms 차이는 코드가 프로덕션 번들에서 제거된 상태의 독립 3회 실행 변동으로 기록하며, 계측 코드의 전송·실행 비용으로 해석하지 않는다.
- 검증: `VERCEL_ENV=development vercel dev`의 허용 이벤트는 204와 구조화 로그를 반환했고, 위치 필드는 400으로 거절했다. Preview·Production 404 정책은 단위 테스트로 검증했다. 단위 테스트 256개와 E2E 7개를 통과했다.
- 판단: 개발 계측은 프로덕션 산출물과 원격 사용자 데이터 수집에 영향을 주지 않는다. 후속 렌더링·초기 로딩 작업은 `real-gpu-before.json`을 기준으로 수치화한다.
- 롤백 조건: 프로덕션 번들에 `/api/performance`이 포함되거나 개발 외 환경에서 2xx가 반환되면 이 변경을 우선 롤백한다.

## 2026-08-13 · 초기 로딩 분리 기준선

- 가설: Cesium과 `SceneCanvas`가 초기 앱 번들에 포함돼 대시보드 셸의 FCP/LCP와 경쟁한다.
- Before: 실제 GPU 중앙값은 데스크톱 FCP/LCP 692ms, CLS 0, Viewer 준비 651.9ms, CPU ×4 FCP/LCP 1,000ms, Viewer 준비 1,927.6ms였다.
- 유지 조건: FCP 또는 LCP 10% 이상 개선, Viewer 준비 악화 15% 이하, CLS 0.02 이하, Viewer 준비 전 마지막 위치 선택 보존.

## 2026-08-13 · 초기 로딩 분리 실험 및 롤백

- 구현: 대시보드 셸 페인트 후 `SceneCanvas`를 동적 import하고 고정 플레이스홀더를 표시했다. Viewer 준비 전 마지막 위치 선택을 대기했다가 준비 후 이동하도록 했고, 해당 E2E를 통과했다.
- After: 데스크톱 FCP/LCP 692 → 1,044/1,060ms(352/368ms 증가, -50.9%/-53.2%), Viewer 준비 651.9 → 1,408.6ms(756.7ms 증가, -116.1%)였다. CPU ×4 FCP/LCP 1,000 → 1,240ms(240ms 증가, -24.0%), Viewer 준비 1,927.6 → 3,291.0ms(1,363.4ms 증가, -70.7%)였다. CLS는 0 → 0으로 유지했다.
- 자산 판단: entry JS gzip은 84.72 → 78.28KiB로 7.6% 작아졌지만 분리 청크 9.14KiB가 추가돼 총 JS gzip은 84.72 → 87.42KiB로 2.70KiB·3.2% 증가했다. 다중 JS/CSS 청크에서 `index-*`를 앱 entry로 선택하도록 측정기를 보정했다.
- 판단: 수치가 목표와 Viewer 악화 한도를 모두 위반하므로 구현·E2E 변경을 되돌렸다. 실패 후보의 3회 JSON과 비교표는 포트폴리오 근거로 보존한다.
- 롤백 확인: 되돌린 `main` 동작과 동일한 정적 import 구조에서 build·단위·E2E를 다시 통과해야 한다.

## 2026-08-13 · 렌더 루프 rAF 실험 및 롤백

- 구현: 강수 `setTimeout` 루프를 rAF로 바꾸고 Canvas 2D context를 캐싱했다. 비가시 탭에서 강수·Auto 품질 분석을 중지하고 복귀 시 재개하도록 했다.
- Before → After: 데스크톱 Rain/Storm/Snow p95는 83.4/66.7/17.7 → 183.2/135.2/66.7ms로 99.8/68.5/49.0ms 증가(-119.7%/-102.7%/-276.8%)했다. CPU ×4는 300.2/266.9/200.8 → 434.7/431.4/432.1ms로 134.5/164.5/231.3ms 증가했다. JS/CSS gzip 증가는 각각 0.08/0.01KiB였다.
- 판단: 프레임 p95가 세 프리셋 모두 5% 회귀 한도를 넘어서 구현과 테스트를 롤백했다. 동일 프레임 큐에서 Canvas, Cesium, 측정 rAF가 경쟁했을 가능성을 후속 trace 분석 과제로 남긴다.
- 검증: 후보 구현의 관련 단위 테스트 49개와 빌드는 통과했다. 롤백 뒤 전체 단위·E2E·빌드 재검증은 PR 전 수행한다.

## 2026-08-13 · Cesium 정적 전송·썸네일

- 가설: 공유 이미지 977,995 bytes와 버전 고정 Cesium 자산의 불명확한 재방문 캐시가 정적 전송량을 늘린다.
- 변경: 썸네일을 1,376×768·977,995 → 1,200×669·213,019 bytes로 재인코딩하고 OG 치수를 맞췄다. `/cesium/*`, `/thumbnail.jpg`에 1년 immutable Cache-Control을 설정했다.
- Before → After: 썸네일은 764,976 bytes·78.2% 감소해 250KiB 목표(256,000 bytes)보다 42,981 bytes 작다. 앱 JS/CSS는 87.67/15.16KiB로 예산을 유지했다.
- 검증: 최적화 후 이미지를 시각 확인하고 빌드와 대시보드 E2E를 실행했다. Vercel Preview에서 헤더를 별도 확인한다.
- 롤백 조건: Preview의 헤더가 누락되거나 Worker·WASM·타일 요청 오류가 발생하면 `vercel.json` 헤더와 썸네일을 되돌린다.
