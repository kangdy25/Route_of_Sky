# Route of Sky 성능 최적화 작업 로그

모든 개선율은 `(Before - After) / Before × 100`으로 계산한다. 단계 측정의 1회 값은 방향 확인용이며, 최종 비교는 각 조건의 3회 중앙값을 사용한다. software WebGL과 실제 GPU 수치는 같은 성과 표에 합산하지 않는다.

## 2026-08-11 · 기준선과 측정 도구

- 가설: 최적화 전 상태를 재현 가능하게 기록해야 이후 개선율을 신뢰할 수 있다.
- 변경: 프로덕션 측정 스크립트, Viewer·타일 성능 mark, 비교 도구와 프로토콜을 추가했다.
- 원본: [before.json](runs/before.json)
- 결과: 배포 산출물 37,522,860B(35.78MiB), 데스크톱 FCP/LCP 3,528ms, Viewer 준비 557.7ms, API 2건·cache hit 0건이었다. 프레임 p95는 Rain 849.9ms, Storm 1,349.9ms, Snow 1,333.6ms였다.
- 판단: 이 실행은 software WebGL이므로 실제 GPU 절대 프레임 성능의 기준으로 쓰지 않고, 동일 환경 상대 비교만 보존한다.
- 롤백 조건: 계측 observer·mark가 앱 동작이나 프로덕션 번들에 런타임 부하를 만들면 제거한다.

## 2026-08-11 · Weather API 캐시와 요청 제어

- 가설: 지역 재방문과 새로고침 때 5분 이내 응답을 재사용하면 외부 요청 수와 대기 시간을 줄일 수 있다.
- 변경: 좌표별 localStorage TTL 캐시, `force: true` 강제 갱신, 동일 요청 병합, 이전 요청 취소, 만료 캐시의 네트워크 장애 복구를 추가했다.
- 원본: [api-cache-step.json](runs/api-cache-step.json)
- Before → After: 고정 시나리오 요청 2 → 1건(1건·50.0% 감소), cache hit 0 → 1건. cache hydration은 데스크톱 0.1ms·CPU 4배 제한 0.5ms로 p95 100ms 목표 안이었다. 최종 3회 중앙값은 0.30ms다.
- 판단: API 호출 수·캐시 반영 목표를 통과했다. 데이터 혼합과 강제 갱신 실패를 막기 위해 좌표 키·취소·만료 정책을 함께 유지한다.
- 롤백 조건: 다른 지역 데이터가 섞이거나, 강제 갱신이 캐시를 우회하지 못하거나, 만료 데이터를 정상 응답보다 우선하면 캐시를 롤백한다.

## 2026-08-11 · 적응형 장면 품질

- 가설: 느린 프레임에서 해상도·날씨 FPS·입자·구름·후처리를 단계적으로 줄이면 저사양 장치의 과부하를 제한할 수 있다.
- 변경: Auto/High/Medium/Low 프로필, 5초 p95 하향·10초 쿨다운·3회 연속 상향 정책, 변경된 하위 시스템만 갱신하는 rAF 병합, Low 눈 단순화와 객체 재사용을 적용했다.
- 원본: [adaptive-quality-step.json](runs/adaptive-quality-step.json)
- 결과: 20초 1회 확인에서 데스크톱 Rain 849.9 → 599.1ms(29.5% 개선), Storm 1,349.9 → 1,083.3ms(19.7% 개선), Snow 1,333.6 → 1,433.3ms(7.5% 회귀)였다. CPU 4배 제한은 Rain 3.1% 개선, Storm 0.05% 개선, Snow 16.3% 회귀였다.
- 판단: 품질 단계 전환과 자원 예산은 유지하되, 이 1회 software WebGL 프레임 결과를 실제 GPU 성과로 사용하지 않는다.
- 롤백 조건: 수동 단계가 예고 없이 변경되거나 확정 측정에서 Snow 회귀가 품질 검증으로 상쇄되지 않으면 해당 효과 또는 Auto 전환을 롤백한다.

## 2026-08-11 · 정적 자산 최적화와 최초 최종 비교

- 가설: 3,174px PNG 로고와 런타임 미사용 GIF가 배포 크기와 첫 콘텐츠 표시를 지연시킨다.
- 변경: 128×128 WebP 로고, 고정 크기·비동기 디코딩 힌트, 문서 전용 WebP 데모 자산을 적용했다.
- 원본: [static-assets-step.json](runs/static-assets-step.json), [after.json](runs/after.json)
- Before → After: 로고 3,872,089 → 5,154B(99.87% 감소), 배포 산출물 35.78 → 13.63MiB(61.9% 감소), 리소스 전송 5.57 → 2.72MiB(51.2% 감소)였다. 데스크톱 FCP/LCP는 3,528 → 3,264ms(7.5%), CPU 4배 FCP/LCP는 3,976 → 3,092ms(22.2%)로 같은 software WebGL 조건에서 단축됐다.
- 실패 실험: Cesium ESM 재빌드는 배포 자산을 12.5% 더 줄였지만 앱 JS gzip이 83.59 → 1,183.55KiB(1,315.9% 증가)로 예산을 위반해 채택하지 않았다.
- 판단: 로고·자산 분리·전송량 개선은 적용했다. 전체 10MiB 목표는 Cesium 런타임 자산 때문에 미달이며, Worker·텍스처를 근거 없이 삭제하지 않는다.
- 롤백 조건: 로고·데모의 시각 손상, 지원 범위 내 WebP 호환성 문제, 실제 요청 검증 없는 Cesium 자산 삭제가 확인되면 해당 변경을 되돌린다.

## 2026-08-13 · 실제 GPU 기준선과 개발 전용 계측

- 가설: software WebGL 수치는 실제 사용자 GPU 체감보다 과도하게 느려 후속 우선순위를 왜곡할 수 있다.
- 변경: 실제 Chrome GPU를 요구하는 `perf:gpu`, SwiftShader·llvmpipe·software renderer 거부, 3회 원본/중앙값 형식을 추가했다. 개발 빌드 `?perf=1`에서만 익명 이벤트를 보내고, 로컬 `vercel dev` 외 `/api/performance`은 404로 차단했다.
- 원본: [gpu-baseline-before.json](runs/gpu-baseline-before.json), [gpu-baseline-after.json](runs/gpu-baseline-after.json)
- 결과: 실제 GPU 기준선은 데스크톱 FCP/LCP 640ms, Viewer 669ms, Rain/Storm/Snow p95 67.4/50.1/17.6ms, CPU 4배 FCP/LCP 940ms, Viewer 1,588ms, p95 282.6/250.0/150.5ms였다. 계측 전후 프로덕션 앱 JS gzip과 전송량은 86,752B·2,853,295B로 동일했다.
- 판단: 이후 런타임 비교는 실제 GPU 기준선만 공식 수치로 사용한다. 개발 계측은 원격 사용자 데이터와 프로덕션 번들 비용을 만들지 않는다.
- 롤백 조건: software renderer 결과 저장, 위치·원시 GPU 정보 저장, 개발 외 환경의 2xx 응답, 프로덕션 번들 포함이 발생하면 즉시 수정 또는 제거한다.

## 2026-08-13 · 초기 로딩 분리 실험과 롤백

- 가설: Cesium과 `SceneCanvas`가 초기 번들에서 대시보드 셸의 FCP/LCP와 경쟁한다.
- 변경: 셸 페인트 후 동적 import, 고정 플레이스홀더, Viewer 준비 전 마지막 위치 선택 대기열을 구현했다.
- 원본: [initial-load-before.json](runs/initial-load-before.json), [initial-load-after.json](runs/initial-load-after.json)
- Before → After: 데스크톱 FCP/LCP 692 → 1,044/1,060ms, Viewer 651.9 → 1,408.6ms, CPU 4배 FCP/LCP 1,000 → 1,240ms, Viewer 1,927.6 → 3,291.0ms로 모두 악화됐다. CLS 0은 유지했다.
- 판단: FCP/LCP 10% 개선·Viewer 악화 15% 이하 조건을 모두 위반해 구현과 관련 E2E 변경을 롤백했다.
- 롤백 조건: 롤백된 정적 import 구조에서 build·단위·E2E가 다시 통과하지 않으면 병합하지 않는다.

## 2026-08-13 · rAF 강수 루프 실험과 롤백

- 가설: `setTimeout` 강수 루프를 rAF로 통합하고 Canvas context를 캐싱하면 프레임 지연을 줄일 수 있다.
- 변경: rAF 루프, context 캐싱, 비가시 탭 중지·복귀, Auto 품질 분석 조정을 구현했다.
- 원본: [render-loop-before.json](runs/render-loop-before.json), [render-loop-after.json](runs/render-loop-after.json)
- Before → After: 데스크톱 Rain/Storm/Snow p95 83.4/66.7/17.7 → 183.2/135.2/66.7ms, CPU 4배 300.2/266.9/200.8 → 434.7/431.4/432.1ms로 모두 악화됐다.
- 판단: 세 프리셋 모두 5% 회귀 한도를 넘어서 구현과 테스트를 롤백했다. Canvas·Cesium·측정 rAF가 같은 프레임 큐에서 경쟁했을 가능성은 trace 과제로 남겼다.
- 롤백 조건: 전체 단위·E2E·build 재검증이 통과하지 않으면 롤백도 병합하지 않는다.

## 2026-08-13 · 썸네일·Cesium 전달과 정적 성능 예산

- 가설: 큰 공유 이미지와 재방문 캐시 정책 부재가 정적 전송량을 늘리고, 예산 자동 검증 부재가 회귀를 놓친다.
- 변경: 썸네일 1,376×768·977,995B를 1,200×669·213,019B로 재인코딩하고 `/thumbnail.jpg`, `/cesium/*`의 immutable 캐시를 추가했다. `perf:budget`과 CI 차단 단계를 추가했다.
- 원본: [static-delivery-before/after](runs/), [budget-ci-before/after](runs/)
- Before → After: 썸네일 764,976B·78.2% 감소, 전체 배포 산출물 14,299,816 → 13,534,839B(5.3% 감소), JS/CSS gzip 86,752/14,950 → 86,752/14,947B였다. 모든 정적 예산을 통과했다.
- 판단: Worker·WASM·타일 요청을 보존하고 1년 immutable 헤더를 Production에서 확인했다. 실제 GPU 측정은 캐시를 끄므로 재방문 효과는 헤더·E2E로 분리해 판정한다.
- 롤백 조건: 헤더 누락, Worker·WASM·타일 오류, 잘못된 entry 집계나 정상 build의 예산 오탐이 있으면 헤더·게이트·이미지를 되돌린다.

## 2026-08-13 · 실제 GPU 최종 관측과 trace 진단

- 원본: [gpu-final-before.json](runs/gpu-final-before.json), [gpu-final-after.json](runs/gpu-final-after.json), [render-trace-after.json](runs/render-trace-after.json)
- 런타임 관측: 데스크톱 FCP/LCP 640 → 732ms, CPU 4배 FCP/LCP 940 → 1,060ms, CPU 4배 Rain/Storm/Snow p95 282.6/250.0/150.5 → 333.6/298.0/217.3ms였다. 초기 로딩·rAF 코드가 이미 롤백된 상태이므로 이 차이를 정적 전달 작업의 인과적 회귀로 주장하지 않는다.
- trace: CPU 4배 Medium 3회 중앙값은 Rain 400.9ms, Storm 383.3ms, Snow 449.9ms였다. Composite/JavaScript 비율은 1.04×/1.04×/1.01×로 1.50× 확정 규칙에 미달해 `unclassified`다.
- 판단: Canvas, Paint/Raster/Composite, Cesium 중 어느 경로도 근거 없이 변경하지 않았다. OffscreenCanvas Worker도 호환성·디버깅 위험만 늘릴 수 있어 도입하지 않았다.
- 롤백 조건: 렌더링 후보는 세 프리셋 15% 개선과 다른 프리셋 5% 이내 회귀, 기능·시각 검증을 동시에 통과할 때만 유지한다.

## 2026-08-13 · 마지막 재측정과 안전한 종료

- 원본: [render-final-before.json](runs/render-final-before.json), [render-final-after.json](runs/render-final-after.json)
- Before → After raw: CPU 4배 Medium Rain 400.9 → 233.8ms(41.7%), Storm 383.3 → 216.0ms(43.6%), Snow 449.9 → 250.9ms(44.2%)였다.
- 판단: 이 기간 런타임 코드는 0건 변경됐다. raw 차이는 환경·브라우저 스케줄링·Cesium 상태 변동으로만 보존하며 최적화 성과로 귀속하지 않는다. High/Medium/Low × Rain/Storm/Snow 시각 캡처 9개와 기존 기능 검증은 통과했다.
- 기록 제외: 전체 18회 재측정 중 Storm 두 번째 실행이 정상 창을 초과한 부분 세트는 공식 결과에서 제외했다. 프리셋별 독립 실행으로 완성된 3회 세트만 보존했다.
- 결론: 안전한 추가 렌더링 개선은 미확정이며, 기능과 High 시각 품질을 희생하지 않고 종료한다.
