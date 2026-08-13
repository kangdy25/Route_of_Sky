# 성능 측정 프로토콜 — Phase 1 아카이브

> 최초 software WebGL 비교의 원본 프로토콜입니다. 실제 GPU 측정 기준은 [통합 사례 연구](case-study.md#재현-가능한-검증-체계)와 Phase 2·3 원본 자료를 참고하세요.

## 고정 조건

- 프로덕션 빌드와 Chromium, 1365×768 뷰포트로 측정합니다.
- 브라우저 HTTP 캐시는 비활성화하고, 날씨 API는 고정 응답으로 대체합니다.
- 데스크톱(CPU 제한 없음)과 저사양(CPU 4배 제한)을 각각 3회 실행하고 중앙값을 비교값으로 사용합니다.
- Google 3D Tiles 시간은 외부 CDN 영향이 있으므로 관찰값으로만 기록합니다.
- 헤드리스 Chromium의 WebGL 구현은 실제 사용자 GPU와 다를 수 있으므로 프레임 시간은 동일 실행 환경의 전·후 상대 비교에 사용합니다.
- 프레임 샘플은 양수인 `requestAnimationFrame` 간격만 사용합니다. Chromium CPU 제한 적용 직후 발생할 수 있는 역행 timestamp는 원본에서 제외합니다.
- 적응형 품질 측정에는 선택 모드, 최종 적용 단계, `quality-applied-*` 마크의 단계별 적용 시점을 함께 기록합니다.

## 실행 방법

```bash
pnpm perf:measure --label before
pnpm perf:measure --label after
pnpm perf:compare
pnpm perf:capture -- --url http://127.0.0.1:4173 --output /tmp/after.png --preset Rain
```

`PERF_SAMPLE_MS`를 지정하면 날씨 프리셋별 프레임 측정 시간을 조절할 수 있습니다. 기본값은 20초입니다.

품질 단계별 시각 검증은 preview 서버를 실행한 뒤 다음 명령으로 High/Medium/Low × Rain/Storm/Snow 9개 조합을 캡처합니다.

```bash
pnpm perf:capture -- --url http://127.0.0.1:4173 --matrix-output-directory /tmp/quality-matrix
```

JS·CSS gzip byte는 Node zlib level 9로 계산해 원본 JSON에 기록합니다. Vite 콘솔의 반올림된 kB 표시와 구분하기 위해 비교표는 KiB를 사용합니다.

## 개선율

낮을수록 좋은 지표의 개선율은 `(Before - After) / Before × 100`입니다. 보고서에는 Before, After, 절대 차이와 개선율을 모두 표기합니다.
