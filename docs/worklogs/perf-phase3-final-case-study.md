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
- 최신 main에서 실제 GPU 재측정을 시도했다. Storm 두 번째 실행이 정상 창을 넘겨 전체 묶음은 폐기했고, 결과 파일도 생성되지 않아 공식 비교에서 제외했다.
- 측정기는 CPU ×4 초기 문서 로드가 30초를 넘길 수 있어 navigation timeout을 90초로 조정했고, `--scenario`/`--preset` 분리 실행을 지원하도록 보완했다.
- 유효한 최종 3회 세트: CPU ×4 Medium Rain 249.0/165.9/233.8ms → 233.8ms, Storm 299.4/117.3/216.0ms → 216.0ms, Snow 250.0/300.0/250.9ms → 250.9ms.
- 코드 변경이 없으므로 초기 기준선 대비 raw 차이(41.7/43.6/44.2%)를 최적화 성과로 귀속하지 않았다.
- High/Medium/Low × Rain/Storm/Snow 9개 시각 캡처를 독립 실행해 확인했고, WebP로 변환 후 PNG는 삭제했다.
- 최종 문서: `measurement-protocol.md`, `comparison.md`, `case-study.md`, 6개 원본과 결합 JSON, 정적 차트를 완성했다.

## 롤백 조건

- 소프트웨어 렌더러, 원시 GPU/위치/키/식별자 저장, 테스트 실패 또는 시각 기능 회귀가 있으면 해당 산출물을 폐기하고 원인을 기록한다.
- 최종 결론: 실제 GPU 병목은 다시 `unclassified`였고 기능 코드도 바꾸지 않았다. 마지막 성능 사이클은 “안전한 개선 미확정·코드 변경 없음”으로 종료한다.
