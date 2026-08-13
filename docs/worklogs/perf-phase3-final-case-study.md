# 작업 일지: Phase 3 최종 사례 연구

## 기본 정보

- 날짜: 2026-08-13
- 브랜치: `codex/perf-phase3-final-case-study`
- 목표: 최신 `main`에서 실제 GPU 최종 측정을 다시 실행하고, 성공 또는 안전한 개선 미확정을 숫자와 근거로 완결한다.

## 기준선과 가설

- 기준선: PR #29의 실제 GPU 20초·3회 중앙값. Desktop High Rain/Storm/Snow는 166.7/182.7/166.7ms, CPU ×4 Medium은 400.9/383.3/449.9ms.
- 가설: PR #30은 런타임을 바꾸지 않았으므로 재측정 결과를 개선 효과로 해석하지 않고, 변동 폭과 재현성만 확인한다.
- 성공 기준: 실제 GPU·익명 환경·고정 mock 조건에서 최종 3회 원본과 중앙값, 동일 조건 시각 캡처, Before/After 비교, 제약을 남긴다.

## 진행 기록

- Before 원본 포인터를 [`../performance/phase3/runs/final-before.json`](../performance/phase3/runs/final-before.json)에 기록했다.
- 다음 단계: 최신 main 기준 non-headless Chrome 실제 GPU 측정, 20초·프리셋별 3회, 이후 시각 캡처와 검증을 수행한다.

## 롤백 조건

- 소프트웨어 렌더러, 원시 GPU/위치/키/식별자 저장, 테스트 실패 또는 시각 기능 회귀가 있으면 해당 산출물을 폐기하고 원인을 기록한다.
