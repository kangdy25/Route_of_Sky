# Route of Sky

3D 하늘과 기상 대시보드를 함께 보여주는 Vue 3 + TresJS 기반 웹 애플리케이션입니다. Google Maps API 키가 있으면 Google Photorealistic 3D Tiles를 사용하고, 없으면 기본 절차적 하늘/지형 씬으로 동작합니다.

## 주요 기능

- 시간대에 따라 변하는 절차적 하늘, 태양, 구름, 안개 표현
- Google Photorealistic 3D Tiles 기반 실사 지형 렌더링
- 기온, 습도, 풍속, 운량, 강수량, 가시거리, AQI 대시보드
- 시간대 탐색 컨트롤과 씬 조명/대기 상태 동기화

## 기술 스택

- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- TresJS / Three.js
- Pinia
- Vitest
- Playwright

## 환경 변수

Google 3D Tiles를 사용하려면 프로젝트 루트에 `.env` 파일을 만들고 아래 값을 설정합니다.

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

API 키가 없으면 Google Tiles 대신 기본 3D 씬이 렌더링됩니다.

## 실행

```bash
pnpm install
pnpm dev
```

기본 개발 서버 주소는 `http://localhost:5173`입니다.

## 검증 명령

```bash
pnpm format
pnpm lint
pnpm test:unit
pnpm test:coverage
pnpm test:e2e
pnpm build
```

## 구조

```bash
src/
  app/             # 앱 루트 컴포넌트
  pages/           # 페이지 단위 조립
  widgets/
    dashboard/     # 대시보드 오버레이와 패널/지표 위젯
  features/
    scene/         # 씬 컴포넌트, composable, 지형 유틸, shader source
    weather/       # 날씨 상태 모델, store, 표시 라벨 유틸
  shared/
    config/        # 환경 설정 접근
    ui/            # 공통 UI 컴포넌트
```

## 참고

- Google Tiles 렌더러는 `useGoogleTilesRenderer` composable에서 생명주기를 관리합니다.
- 대시보드 카드의 공통 패널 스타일은 `shared/ui/Panel.vue`를 사용합니다.
- 시간대 탐색의 원형 버튼은 `shared/ui/IconButton.vue`를 사용합니다.
- Vite build 시 Three.js 계열 번들 크기로 인해 chunk size warning이 발생할 수 있습니다.
