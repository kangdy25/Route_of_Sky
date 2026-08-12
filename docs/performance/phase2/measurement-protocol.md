# Phase 2 실제 GPU 측정 프로토콜

## 고정 조건

- 로컬 Google Chrome 실제 GPU 가속, 창 모드, 1365×768, deviceScaleFactor 1
- HTTP 캐시 비활성화, 동일한 프로덕션 빌드, 데스크톱(CPU ×1)과 저사양(CPU ×4) 분리
- 각 조건을 3회 실행하고 중앙값으로 공식 값을 확정
- Weather API는 고정 응답으로 대체해 외부 공급자 지연·키 노출을 제거
- SwiftShader, llvmpipe, software renderer가 탐지되면 결과 저장 없이 실패

## 실행 명령

```bash
pnpm run perf:gpu -- --label real-gpu-before --runs 3
pnpm run perf:gpu -- --label phase2-final-after --runs 3
node scripts/performance/compare-gpu.mjs \
  --before docs/performance/phase2/runs/real-gpu-before.json \
  --after docs/performance/phase2/runs/phase2-final-after.json \
  --output docs/performance/phase2/final-comparison.md
```

`perf:gpu`는 headless 브라우저를 사용하지 않으며, 결과에는 GPU 모델·드라이버·개인 식별 정보 대신 `hardwareAcceleration: true`만 보존합니다.

## 시나리오와 지표

1. 최초 진입: FCP, LCP, CLS, Long Task p95, Event Timing p95, Viewer 준비, 타일 안정화, 전송량
2. 위치 변경: 선택 입력부터 화면 안정화까지의 시간과 날씨 요청
3. Rain·Storm·Snow: 각 20초 동안 rAF 간격 p95
4. 새로고침: localStorage Weather 캐시 hit/miss, 반영 시간, 네트워크 요청 수
5. 품질: 적용 품질과 적용 전환 마크

Event Timing을 지원하지 않는 브라우저는 값 `null`과 `unsupported` 상태를 저장합니다. Google 3D Tiles의 외부 응답은 변동성이 있으므로 타일 안정화는 관측값이며 단독 회귀 판정 근거로 사용하지 않습니다.

## 최종 비교 해석

- 공식 `After`는 최신 main에서 데스크톱·CPU ×4 각각 3회 실행한 `runs/phase2-final-after.json`이다. Before 원본은 `runs/real-gpu-before.json`을 그대로 참조한다.
- HTTP 캐시를 끄고 Weather 응답을 모킹하므로, 이 명령의 API 요청 수는 캐시 정책의 효과가 아니라 시나리오 통제를 보여준다. Weather 5분 캐시는 통합 E2E에서 별도로 검증한다.
- 최종 수치가 서로 다른 시간대의 독립 3회 배치이므로, GPU/OS 스케줄링과 Cesium 초기화 변동을 포함한다. 성능 목표를 못 맞춘 후보 구현은 코드까지 롤백하고, 수치만 실패 근거로 보존한다.

## 개발 전용 계측

`?perf=1`와 개발 빌드가 동시에 충족될 때만 익명 이벤트를 `POST /api/performance`로 보냅니다. 이 엔드포인트는 `VERCEL_ENV=development vercel dev`에서만 구조화 로그를 출력하며 Preview·Production에서는 404입니다. 위치, 원시 URL, API 키, 식별자, GPU 모델은 수집하지 않습니다.
