# 작업 일지: vite-tailwind-native-loader

## 기본 정보

- 날짜: 2026-09-05
- 브랜치: `practice/my-own-practice`
- 관련 PR: 없음
- 목표: Vite 8 config bundler가 Tailwind native `.node` 의존성을 JavaScript로 로드해 `pnpm build`와 Vitest가 시작하지 못하는 문제를 해결한다.

## 기준선과 가설

- 기준선: 기본 `pnpm build`는 `@tailwindcss/oxide-*-*.node`의 UTF-8 로드 오류로 실패하고, Vitest도 같은 `vite.config.ts`를 읽는 단계에서 실패한다.
- 가설: 앱 실행 설정은 Vite native config loader로 로드하고, 테스트 설정은 Tailwind 플러그인을 포함하지 않는 별도 `vitest.config.ts`로 분리하면 각 도구가 필요한 의존성만 로드한다.
- 성공 기준: `pnpm build`, 대표 Vitest 실행, `pnpm test:unit --run`이 config 로드 오류 없이 실행된다. 개발 서버와 preview도 기본 package script로 시작한다.

## 변경 내용

- `vite.config.ts`를 앱 실행 전용 설정으로 정리하고 `defineConfig`를 `vite`에서 가져오게 했다.
- `vitest.config.ts`를 추가해 Vue SFC 변환·alias·기존 coverage/exclude 설정만 둔다. 테스트에는 CSS 생성이 필요 없으므로 Tailwind Vite 플러그인을 포함하지 않는다.
- `dev`, `build`, `preview` script에 `--configLoader native`를 추가했다. 따라서 Vite가 config를 기본 bundler로 묶는 대신 Node의 native loader로 읽는다.

## 검증

- 실행 명령: `pnpm build`, `pnpm test:unit --run`, `pnpm dev -- --host 127.0.0.1 --port 5173`, `pnpm exec prettier --write package.json vite.config.ts vitest.config.ts docs/worklogs/vite-tailwind-native-loader.md`, `git diff --check`.
- 테스트 결과: `pnpm build` 통과했고, 개발 서버도 `http://127.0.0.1:5173/`에서 준비 완료까지 확인했다. Vitest는 Tailwind native `.node` 로드 오류 없이 테스트 실행 단계까지 진입했다.
- 남은 기존 테스트 실패: `WeatherSyncStatus.spec.ts` 2건은 현재 UI 문자열(`...`, `이전 날씨`)과 기대 문자열이 다르고, `SceneCanvas.spec.ts` 1건은 현재 SSE 8과 기대값 2가 다르다. 이번 loader 수정과 무관한 assertion 불일치라 동작·테스트 코드는 수정하지 않았다.
- Before → After: `pnpm build`의 Tailwind native `.node` UTF-8 로드 오류 → build 통과. `pnpm test:unit --run`의 같은 config 로드 오류 → 테스트 실행 시작.

## 판단과 롤백

- 판정: Tailwind native loader 문제 해결.
- 위험: 테스트 설정이 앱 설정의 alias 또는 Vue SFC 변환 조건과 달라질 수 있다. 필요한 공통 Vite 옵션이 생기면 두 설정에 의도적으로 함께 반영해야 한다.
- 롤백 조건: build·unit test·개발 서버 중 하나라도 설정 차이로 실패하면 package script와 설정 분리를 되돌린다.
- 다음 작업: 별도 작업으로 위 3개 assertion이 현재 UI·SSE 정책 중 어느 쪽을 기준으로 해야 하는지 확인한다.
