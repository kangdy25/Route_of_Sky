# 성능 측정 프로토콜

## 고정 조건

- 프로덕션 빌드와 Chromium, 1365×768 뷰포트로 측정합니다.
- 브라우저 HTTP 캐시는 비활성화하고, 날씨 API는 고정 응답으로 대체합니다.
- 데스크톱(CPU 제한 없음)과 저사양(CPU 4배 제한)을 각각 3회 실행하고 중앙값을 비교값으로 사용합니다.
- Google 3D Tiles 시간은 외부 CDN 영향이 있으므로 관찰값으로만 기록합니다.
- 헤드리스 Chromium의 WebGL 구현은 실제 사용자 GPU와 다를 수 있으므로 프레임 시간은 동일 실행 환경의 전·후 상대 비교에 사용합니다.

## 실행 방법

```bash
pnpm perf:measure --label before
pnpm perf:measure --label after
pnpm perf:compare
```

`PERF_SAMPLE_MS`를 지정하면 날씨 프리셋별 프레임 측정 시간을 조절할 수 있습니다. 기본값은 20초입니다.

## 개선율

낮을수록 좋은 지표의 개선율은 `(Before - After) / Before × 100`입니다. 보고서에는 Before, After, 절대 차이와 개선율을 모두 표기합니다.
