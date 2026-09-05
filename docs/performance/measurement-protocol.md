# Route of Sky 성능 측정 프로토콜

## 공통 원칙

- 시간·용량·호출 수 개선율은 `(Before - After) / Before × 100`으로 계산한다.
- 모든 보고 표에는 Before, After, 절대 차이, 개선율, 목표 판정을 적는다.
- 외부 Google 3D Tiles와 실제 Weather API의 지연은 관찰할 수 있지만, 그 변동만으로 회귀를 판정하지 않는다.
- API 키, 환경 변수, 위치, 식별자, 원시 URL 쿼리, 원시 GPU 모델·드라이버, 원시 trace는 Git·문서·스크린샷·JSON에 저장하지 않는다.

## 최초 상대 비교 기록

최초 기록은 프로덕션 빌드 Chromium, 1365×768, HTTP 캐시 비활성화, 데스크톱과 CPU 4배 제한 각각 3회 중앙값으로 수집했다. Weather 응답은 고정했다.

이 실행은 headless software WebGL을 사용했다. 따라서 FCP·LCP·Viewer·정적 전송·API의 동일 환경 상대 비교는 보존하지만, frame p95 절대값은 실제 사용자 GPU 성능이나 실제 GPU 최적화 성과로 사용하지 않는다. 원본은 [runs/before.json](runs/before.json)과 [runs/after.json](runs/after.json)이다.

## 실제 GPU 공식 측정

| 항목 | 고정 조건 |
| --- | --- |
| 브라우저 | non-headless 로컬 Google Chrome |
| 하드웨어 판정 | CDP GPU 검사 통과, 결과에는 `hardwareAcceleration: true`만 보존 |
| 거부 조건 | SwiftShader, llvmpipe, software renderer 탐지 |
| 뷰포트 | 1365×768, DPR 1 |
| 네트워크 | HTTP 캐시 비활성화 |
| Weather | 로컬 고정 mock 응답 |
| 실행 횟수 | 각 조건 3회, 중앙값 사용 |
| 저사양 | Chrome CDP CPU slowdown 4배 |
| 날씨 프리셋 | Rain·Storm·Snow, 각 20초 |

```bash
pnpm run perf:gpu -- --label gpu-baseline --runs 3
pnpm run perf:gpu -- --label gpu-final --runs 3
node scripts/performance/compare-gpu.mjs \
  --before docs/performance/runs/gpu-baseline-before.json \
  --after docs/performance/runs/gpu-final-after.json \
  --output /tmp/performance-comparison.md
```

수집 지표는 최초 진입 FCP/LCP/CLS, Viewer 준비, 타일 안정화, Long Task p95, Event Timing p95, 위치 변경, Rain/Storm/Snow frame p95, API hit/miss·응답 시간, 품질 전환, 전송량이다. Event Timing 미지원 환경은 `null`과 `unsupported` 이유를 기록한다.

공식 측정은 HTTP 캐시를 끄고 Weather 응답을 모킹하므로 API 요청 수는 캐시 정책 효과가 아니라 시나리오 통제를 보여 준다. 5분 Weather 캐시와 강제 새로고침은 Playwright 통합 테스트로 별도 검증한다.

## 초기 3D 씬 안정화 측정

Google 3D Tiles의 첫 타일 표시와 이후 LOD 요청이 멈추는 시점은 구분한다. 이 비교는 다음과 같이 데스크톱 실제 GPU에서 각 SSE 값 3회씩 실행한다.

```bash
pnpm build
node scripts/performance/measure-gpu.mjs \
  --skip-build --initial-only --desktop-only --runs 3 --label sse8-usable
```

- `route-of-sky:tiles-stable`: 첫 `tileLoad` 뒤 화면을 표시하기 시작한 시점.
- `route-of-sky:initial-view-ready`: 첫 타일 이후 Cesium의 요청·처리 큐가 500ms 동안 비어 초기 구도가 안정됐다고 판단한 시점.
- **후속 LOD 안정화 시간**은 `initial-view-ready - tiles-stable`로 계산한다. 이는 사용자가 장면이 더 이상 계속 바뀌지 않는다고 느끼는 Time to Usable Scene 지표다.
- SSE가 다른 조건은 요구하는 최종 상세도가 다르다. 따라서 이 결과는 “동일한 시각 품질을 더 빨리 렌더링”한 결과가 아니라, **허용 가능한 상세도 목표를 조정해 사용 가능한 씬까지의 시간을 줄인 UX 개선**으로만 기록한다.

## 실제 GPU 렌더링 trace

```bash
pnpm run perf:render-trace -- --url http://127.0.0.1:4195 --label render-trace --runs 3
pnpm run perf:render-trace:combine
node scripts/performance/capture.mjs --url http://127.0.0.1:4208 \
  --quality medium --preset Rain --output /tmp/medium-rain.png
```

- CPU 4배 제한 Medium과 Desktop High를 각각 Rain·Storm·Snow 20초·3회씩 실행한다.
- `frameP95Ms`, main-thread task, JavaScript, GC, Paint/Raster, Composite, Cesium/GPU proxy의 익명 집계를 저장한다.
- 원시 trace는 운영체제 임시 디렉터리에만 생성하고 분석 후 삭제한다.
- trace 범주는 포함 관계일 수 있으며 Cesium/GPU proxy는 실제 GPU 시간이나 Cesium만의 비용을 뜻하지 않는다.
- 병목은 각 프리셋의 세 반복 모두에서 같은 카테고리가 최대이고, 두 번째 비용의 1.50배 이상일 때만 확정한다. 그 외에는 `unclassified`로 기록하고 기능 코드를 바꾸지 않는다.

## 정적 예산과 시각 검증

```bash
pnpm run build
pnpm run perf:budget
pnpm run test:e2e
pnpm run perf:capture -- --url http://127.0.0.1:4173 --matrix-output-directory /tmp/quality-matrix
```

`perf:budget`의 차단 예산은 앱 JS gzip 90KiB, CSS gzip 18KiB, 공유 썸네일 250KiB, 전체 배포 산출물 13.63MiB 이하이다. 정적 예산은 CI 차단 조건이며, 실제 GPU 수치는 환경 의존성이 있어 원본 3회 JSON과 비교표로 검토한다. 품질 검증은 High/Medium/Low × Rain/Storm/Snow 캡처를 같은 조건에서 남긴다.

## 개발 전용 익명 계측

`import.meta.env.DEV`와 `?perf=1`이 동시에 참일 때만 이벤트를 `POST /api/performance`로 전송한다. 이 엔드포인트는 `VERCEL_ENV=development vercel dev`에서 허용 목록의 익명 이벤트를 구조화 로그로 출력하며 Preview·Production에서는 404를 반환한다. 원격 사용자 정보와 원시 장치 정보는 수집·저장·전송하지 않는다.

## 해석 규칙

렌더링 런타임 코드가 바뀌지 않은 두 재측정 사이의 수치 차이는 GPU 부하, 운영체제·브라우저 스케줄링, Cesium 타일 상태의 변동일 수 있다. 코드 변경과 동일 조건 재측정이 함께 있을 때만 인과적 성능 개선으로 인정한다. 목표를 충족하지 못하거나 다른 프리셋이 5%를 초과해 회귀하면 구현을 롤백하고 수치·원인·대안을 기록한다.
