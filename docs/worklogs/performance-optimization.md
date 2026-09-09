# 작업 일지: 성능 기록 완전 통합

## 기본 정보

- 날짜: 2026-08-14
- 브랜치: `codex/performance-records-consolidation`
- 관련 PR: #33 — 2026-08-14 Merge commit으로 `main` 병합 완료 (`07199d3`)
- 목표: 분리된 성능 기록과 백업 사례 문서를 제거하고, 동일한 근거를 단일 성능 문서·원본 측정·자산 구조로 재구성한다.

## 기준선과 가설

- 기준선: 공개 사례 연구는 통합되어 있지만, 작업 시기별 폴더, 백업 사례 문서, 개별 작업 일지가 남아 있어 독자가 기록을 따라가기 위해 여러 경로를 오가야 한다.
- 가설: 적용된 개선, 롤백된 실험, 실제 GPU 진단을 하나의 시간순 로그와 공통 비교표에 통합하고 원본 JSON·자산을 평탄화하면 근거를 잃지 않고 포트폴리오 전달력을 높일 수 있다.
- 성공 기준: 모든 원본 JSON과 시각 자산을 보존하고, 문서에서 수치의 환경·인과관계·판정을 구분하며, 더 이상 시기별 폴더 또는 백업 문서를 참조하지 않는다.

## 변경 내용

- 기준선 기록. 기존 적용 작업은 정적 자산·API 캐시·적응형 품질이고, 실제 GPU 초기 로딩·rAF 후보는 수치 미달로 롤백됐으며, 마지막 trace는 단일 병목 미확정으로 코드 변경 없이 종료됐다.
- 통합 문서에는 위 결과를 시간순 작업 로그, 전체 비교표, 공통 측정 프로토콜, 공개 사례 연구로 재구성한다.
- 시기별 하위 폴더의 JSON·시각 자산을 `docs/performance/runs/`, `docs/performance/assets/`로 의미 기반 이름으로 이동한다.
- 실행 스크립트의 기본 출력 경로도 공통 `runs/`로 바꾸고, 더 이상 존재하지 않는 문서 경로를 참조하지 않게 한다.
- 저장소 작업 규칙도 같은 공통 구조를 가리키도록 갱신해 다음 성능 작업이 다시 분리된 문서를 만들지 않게 한다.

## 검증

- 기준 확인: `git status --short --branch`, 성능 문서·원본 파일 목록 확인.
- Before → After: 문서 구조 작업으로 성능 수치와 애플리케이션 런타임은 변경하지 않는다. 기존 실제 GPU 및 software WebGL 측정 원본을 보존하고, 링크·스크립트·정적 예산·테스트를 사후 검증한다.
- JSON 원본 전체 파싱, Markdown 로컬 링크 검사, 성능 스크립트 네 개의 구문 검사를 통과했다. 시기별 경로·백업 문서·이전 파일명 참조는 남지 않았다.
- `pnpm run lint`, `pnpm run test:unit --run`(34개 파일·256개 테스트), `pnpm run build`, `pnpm run perf:budget`, `pnpm run test:e2e`(7개)를 통과했다. E2E 첫 실행은 sandbox의 로컬 포트 수신 제한으로 중단됐고, 승인된 동일 명령 재실행에서 통과했다.
- `perf:budget`: JS gzip 86,752/92,160B, CSS gzip 14,947/18,432B, dist 13,534,839/14,292,091B, thumbnail 213,019/256,000B로 모두 통과했다.
- 구조·문서·측정 원본 경로만 변경했으며 앱 런타임과 기존 측정 수치를 바꾸지 않았으므로 실제 GPU 3회 측정과 시각 캡처는 반복하지 않았다. 기존 3회 JSON과 9개 시각 검증 자산을 공통 경로에서 그대로 보존했다.
- PR #33은 diff·테스트·측정 원본·문서 누락을 자체 검토한 뒤 Merge commit으로 병합됐다. 병합 후 `pnpm exec eslint .`와 `git diff --check origin/main...HEAD`를 다시 통과했다.

## 판단과 롤백

- 판정: 통과. 단일 사례 연구, 비교표, 프로토콜, 시간순 로그, 공통 원본·자산 구조만 남긴다.
- 위험: 서로 다른 측정 환경을 하나의 개선 수치처럼 오해하거나, 원본 파일 이동 뒤 문서·스크립트 링크가 끊길 수 있다.
- 롤백 조건: 원본 수치의 출처·환경·판정이 복원되지 않거나, 문서·스크립트 링크 검증이 실패하면 평탄화 변경을 되돌린다.
- 다음 작업: 완료. 요청에 따라 추가 런타임 병목 조사·최적화 작업은 진행하지 않는다.

---

## 초기 3D Tiles 표시: SSE 2와 SSE 8 재측정

- 날짜: 2026-09-05
- 브랜치: `practice/my-own-practice`
- 가설: `SceneCanvas.vue`에서 첫 타일 이벤트 뒤 적용하는 `tileset.maximumScreenSpaceError`를 2에서 8로 높이면, 최초 3D Tiles 표시 시간이 빨라질 수 있다.

### 측정 조건

- non-headless 로컬 Google Chrome, 하드웨어 가속 확인, 1365×768, DPR 1.
- CDP로 HTTP 캐시를 비활성화하고 Weather 응답은 고정 mock으로 대체했다.
- 각 조건을 데스크톱(CPU ×1)과 저사양 모사(CPU ×4)에서 3회 실행하고 중앙값을 사용했다.
- 측정 지표는 `route-of-sky:tiles-stable` mark다. 이는 첫 `tileLoad` 또는 warm-up timeout 뒤 찍히므로, **첫 3D 타일이 화면에 표시되기 시작한 시점**을 나타내며 모든 상세 LOD의 완료 시간은 아니다.
- 원본: [SSE 2 run 1](../performance/runs/sse2-initial-run1.json), [run 2](../performance/runs/sse2-initial-run2.json), [run 3](../performance/runs/sse2-initial-run3.json), [SSE 8 run 1](../performance/runs/sse8-probe.json), [run 2](../performance/runs/sse8-initial-run2.json), [run 3](../performance/runs/sse8-initial-run3.json).

### 결과

| 조건 | Before: SSE 2 중앙값 | After: SSE 8 중앙값 | 절대 차이 | 개선율 | 판정 |
| --- | ---: | ---: | ---: | ---: | --- |
| 데스크톱 첫 타일 표시 | 3,709.1ms | 3,728.3ms | -19.2ms | -0.5% | 개선 없음 |
| CPU ×4 첫 타일 표시 | 6,134.4ms | 6,383.2ms | -248.8ms | -4.1% | 개선 없음 |

### 해석과 판단

- `maximumScreenSpaceError = 2/8`은 `settleInitialTiles()` 안에서 `tileLoad`가 이미 발생한 **이후**에 적용된다. 따라서 위 최초 표시 지표의 경로에는 원리상 영향을 주지 않는다.
- 데스크톱의 19.2ms, 저사양의 248.8ms 차이는 외부 Google 3D Tiles 전달·브라우저 스케줄링의 반복 변동 범위로 보고, SSE 변경의 인과적 회귀나 개선으로 해석하지 않는다.
- SSE 8에서 느껴지는 차이는 첫 화면 표시가 아니라, 그 뒤 필요한 상세 LOD를 얼마나 적극적으로 추가 요청·렌더링하는지의 차이일 가능성이 높다. 이 수치만으로 “초기 로딩 0.5% 개선”처럼 포트폴리오에 쓰지 않는다.
- 요청된 최종 값은 SSE 8로 유지했다. 후속 LOD 안정화는 아래 항목에서 타일 요청·처리 큐의 500ms 유휴 시간을 기준으로 별도 측정했다.

### 검증

- `pnpm exec vite build --configLoader native` 통과 (SSE 8 복원 상태).
- `measure-gpu.mjs --initial-only`이 실제 GPU 확인·HTTP 캐시 비활성화 조건에서 원본 JSON 6개를 생성했다.
- 기본 `pnpm build`는 Vite config bundler가 Tailwind native `.node` 파일을 잘못 로드하는 기존 환경 문제로 실패했다. `--configLoader native` 빌드는 통과했으며, 측정 스크립트는 이 경로를 사용하도록 보완했다.

---

## 초기 3D 씬 안정화: SSE 2와 SSE 8 비교

- 날짜: 2026-09-05
- 브랜치: `practice/my-own-practice`
- 가설: 첫 타일 표시 뒤 목표 SSE를 2에서 8로 완화하면, 후속 LOD 요청이 멈춰 사용 가능한 초기 구도가 되는 시간이 줄어든다.

### 측정 조건과 지표

- non-headless 로컬 Google Chrome, 하드웨어 가속 확인, 1365×768, DPR 1, HTTP 캐시 비활성화, Weather 고정 mock, 데스크톱 CPU ×1.
- 각 SSE에서 3회 실행하고 중앙값을 사용했다. SSE 2 측정 뒤 SSE 8을 다시 1회 실행해 결과 범위를 확인했다.
- `tiles-stable`은 첫 타일 표시 시점, `initial-view-ready`는 이후 Cesium의 요청·처리 큐가 500ms 연속으로 빈 시점이다. 후속 LOD 안정화 시간은 두 mark의 차이다.
- 원본: [SSE 2 run 1](../performance/runs/sse2-usable-idle-run1.json), [run 2](../performance/runs/sse2-usable-idle-run2.json), [run 3](../performance/runs/sse2-usable-idle-run3.json), [SSE 8 run 1](../performance/runs/sse8-usable-idle-run1.json), [run 2](../performance/runs/sse8-usable-idle-run2.json), [run 3](../performance/runs/sse8-usable-idle-run3.json), [SSE 8 재측정](../performance/runs/sse8-usable-idle-recheck.json).

### 결과

| 지표 | Before: SSE 2 중앙값 | After: SSE 8 중앙값 | 절대 차이 | 개선율 | 판정 |
| --- | ---: | ---: | ---: | ---: | --- |
| 첫 타일 표시 | 3,695.7ms | 3,706.8ms | -11.1ms | -0.3% | 변화 없음 |
| 후속 LOD 안정화 | 32,407.2ms | 16,091.1ms | 16,316.1ms | 50.3% | 개선 |
| 초기 구도 준비 완료 | 36,112.3ms | 19,788.9ms | 16,323.4ms | 45.2% | 개선 |

SSE 8 재측정의 후속 LOD 안정화 시간은 14,709.6ms로, 앞선 SSE 8 세 반복(15,809.3ms, 16,091.1ms, 16,480.7ms)과 같은 범위였다.

### 해석과 판단

- SSE 8은 SSE 2보다 더 큰 화면 오차를 허용하므로 같은 구도에서 요청·처리해야 할 하위 LOD가 줄어든다. 그 결과 첫 화면 표시는 그대로지만, 장면 변화가 멈추는 시간은 약 절반으로 줄었다.
- 이 결과는 **동일한 최종 상세도를 더 빨리 만든 성능 향상**이 아니다. 목표 상세도를 UX에 필요한 수준으로 조정해 Time to Usable Scene을 줄인 개선이다.
- 외부 Google 3D Tiles의 전달 시간은 변동 요인이다. 다만 SSE 2와 SSE 8 모두 3회 반복했고, SSE 8을 SSE 2 뒤에 다시 측정해도 같은 범위를 확인했으므로, 이 시나리오에서는 SSE 8을 유지한다.
- CPU ×4 조건은 타일 요청이 장시간 계속돼 500ms 유휴 기준을 안정적으로 만족하지 않아 이 항목의 성과 수치에는 포함하지 않았다. 저사양 별도 UX 목표를 정한 뒤 재측정한다.

### 검증

- `pnpm build` 통과 (최종 SSE 8 복원 상태).
- `pnpm exec vue-tsc -b`, `node --check scripts/performance/measure-gpu.mjs` 통과.
- `SceneCanvas.spec.ts`, `performanceTelemetry.spec.ts`, `api/performance.spec.js` 24개 테스트 통과.
