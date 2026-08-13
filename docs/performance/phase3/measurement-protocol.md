# Phase 3 측정 프로토콜

## 목적

Phase 3의 공식 수치는 실제 GPU가 활성화된 로컬 Google Chrome에서만 산출한다. 렌더링 최적화의 성공 여부는 CPU ×4 · Medium Rain/Storm/Snow의 frame p95를 각각 15% 이상 낮췄는지로 판단한다. High는 시각 품질을 낮추지 않는 비교 기준이다.

## 고정 환경

| 항목 | 값 |
| --- | --- |
| 브라우저 | non-headless Google Chrome |
| 하드웨어 판정 | CDP GPU 검사 통과. `hardwareAcceleration: true`만 저장 |
| 거부 조건 | SwiftShader, llvmpipe, software renderer 감지 |
| 뷰포트 | 1365×768, DPR 1 |
| 네트워크 | HTTP 캐시 비활성화 |
| Weather | 로컬 고정 mock 응답. 실제 위치·API 키·URL 쿼리를 저장하지 않음 |
| 실행 횟수 | 각 조건 3회, 중앙값 사용 |
| 관찰 창 | 프리셋 적용 후 20초 |
| 저사양 | Chrome CDP CPU slowdown 4배, Medium 고정 |
| 비교 기준 | Desktop High도 동일하게 3회 기록 |

원시 GPU 모델·드라이버, 원시 Chrome trace, 위치, 식별자, API 키는 Git과 문서에 남기지 않는다. trace 원본은 운영체제 임시 디렉터리에만 생성하고 분석 후 삭제한다.

## 명령

```bash
# 빌드와 18회 전체 trace (초기 기준선용)
pnpm run perf:render-trace -- --url http://127.0.0.1:4195 --label render-trace-after --runs 3

# 재시도·재현 시 프리셋을 새 브라우저에서 분리 실행
pnpm run perf:render-trace -- --skip-build --url http://127.0.0.1:4201 \
  --label final-after-low-end-medium-rain --scenario low-end-medium --preset Rain --runs 3

# 분리된 6개 JSON을 최종 원본으로 결합
pnpm run perf:render-trace:combine

# High/Medium/Low × Rain/Storm/Snow 시각 검증
node scripts/performance/capture.mjs --url http://127.0.0.1:4208 \
  --quality medium --preset Rain --output docs/performance/phase3/assets/visuals/medium-rain.png
```

Playwright는 WebP 스크린샷을 직접 지원하지 않으므로, 검증용 PNG를 생성한 뒤 `cwebp -q 82`로 변환하고 PNG를 삭제한다. 최종 보관 자산은 WebP뿐이다.

## 수집 값과 해석

- `frameP95Ms`: 페이지 `requestAnimationFrame` 간격의 95백분위. 낮을수록 좋다.
- `mainThreadTaskP95Ms`, JavaScript, GC, Paint/Raster, Composite, Cesium/GPU proxy: Chrome trace의 익명 집계다.
- Cesium/GPU proxy는 실제 GPU 시간이나 Cesium만의 비용을 뜻하지 않는다. trace 이벤트는 포함 관계가 있으므로 카테고리 합계도 실제 총시간이 아니다.
- Event Timing·FCP/LCP는 이 렌더링 trace 시나리오의 판단 지표가 아니며, Phase 2 원본을 보존한다.

병목은 **각 프리셋의 세 반복 모두에서 같은 카테고리가 가장 크고, 두 번째 카테고리의 1.5배 이상**일 때만 확정한다. 그렇지 않으면 `unclassified`로 기록하고 기능 코드를 바꾸지 않는다.

## 산식과 판정

시간·용량·호출 수의 개선율은 다음으로 통일한다.

```text
(Before - After) / Before × 100
```

각 표는 Before, After, 절대 차이, 개선율, 목표 판정을 함께 표시한다. 단, 런타임 코드가 바뀌지 않은 두 재측정 사이의 수치 차이는 환경 변동일 수 있으므로 **인과적 성능 개선으로 귀속하지 않는다.** 목표 달성은 코드 변경과 동일 조건 재측정이 함께 있을 때만 인정한다.

## 외부 변동 한계

Weather는 고정 mock으로 분리했지만 Cesium 타일·브라우저 스케줄링·운영체제의 자원 경쟁은 로컬 trace에 영향을 줄 수 있다. 이번 최종 재측정에서 코드 변경 없이 큰 p95 차이가 발생한 것은 이 한계를 실제로 보여준다. 따라서 단일 3회 측정을 보편 성능 수치로 일반화하거나, 코드 변경 없는 결과를 최적화 성공으로 표시하지 않는다.
