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
