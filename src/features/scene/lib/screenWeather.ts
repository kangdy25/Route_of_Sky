import { Math as CesiumMath } from 'cesium'
import type { Ref } from 'vue'

import type { SceneQualityProfile, SceneWeatherState } from '../model/scene.types'
import { clampToRange, clampToUnitInterval, smoothstep } from './math'
import { SCENE_QUALITY_PROFILES } from './sceneQuality'
import { getPrecipitationMode, getSnowstormIntensity, getThunderstormIntensity } from './weather'

/** 2D 캔버스 공간에 렌더링되는 개별 강수(비/눈) 입자 인터페이스 */
interface ScreenWeatherParticle {
  x: number
  y: number
  size: number
  speed: number
  drift: number
  alpha: number
  phase: number
}

/** 바람에 의한 화면 2D 투영 벡터 (X, Y 방향 단위 벡터) */
interface WindScreenVector {
  x: number
  y: number
}

/** 번개 줄기를 구성하는 개별 선분 데이터 */
interface LightningSegment {
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  alpha: number
}

/** 생성된 번개 한 줄기의 수명 및 섬광 데이터 */
interface LightningStrike {
  bornAt: number
  duration: number
  flash: number
  segments: LightningSegment[]
}

/**
 * Cesium 3D 월드 좌표계 대신 뷰포트 상단 2D HTML Canvas 위에
 * 비, 눈, 번개 파티클을 가볍고 빠르게 그려내는 고성능 오버레이 렌더러.
 *
 * DOM 크기 조회(Forced Reflow)를 최소화하고, 브라우저 VSync(rAF) 주기에 맞춰 프레임을 조율합니다.
 */
export class ScreenWeatherRenderer {
  // 렌더 루프 및 타이머 제어
  private animationFrameId = 0
  private lastFrame = 0

  // 캔버스 뷰포트 및 리사이즈 감시 (리플로우 방지)
  private observedCanvas: HTMLCanvasElement | null = null
  private resizeObserver: ResizeObserver | null = null
  private isCanvasSizeDirty = false
  private canvasMetrics = { width: 1, height: 1, pixelRatio: 1 }

  // 날씨 효과(파티클·번개) 시뮬레이션 데이터
  private particles: ScreenWeatherParticle[] = []
  private lightningStrikes: LightningStrike[] = []
  private nextLightningAt = 0

  // 외부 주입 참조 및 설정
  private quality = SCENE_QUALITY_PROFILES.high
  private readonly canvasRef: Ref<HTMLCanvasElement | null>
  private readonly getState: () => SceneWeatherState

  constructor(canvasRef: Ref<HTMLCanvasElement | null>, getState: () => SceneWeatherState) {
    this.canvasRef = canvasRef
    this.getState = getState
  }

  /** 외부 날씨 상태 변경 시 호출되어, 강수 여부에 따라 렌더 루프를 동적으로 시작하거나 중지합니다. */
  update() {
    if (getPrecipitationMode(this.getState())) {
      this.start()
      return
    }

    this.stop()
  }

  /** 렌더링 품질 프로필을 전환합니다. */
  setQuality(quality: SceneQualityProfile) {
    this.quality = quality
  }

  /** 2D 캔버스 렌더링 루프를 구동합니다. (구동 중인 경우 중복 호출을 무시합니다.) */
  start() {
    if (this.animationFrameId) return

    this.lastFrame = 0
    this.animationFrameId = window.requestAnimationFrame(this.renderFrame)
  }

  /** 렌더 루프를 완전히 멈추고, 등록된 옵저버 및 파티클 메모리 배열을 비웁니다. */
  stop() {
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId)
    }

    this.animationFrameId = 0
    this.lastFrame = 0
    this.disconnectResizeObserver()
    this.particles = []
    this.lightningStrikes = []
    this.nextLightningAt = 0
    this.clearCanvas()
  }

  /** 현재 설정된 퀄리티 프로필(FPS)에 따른 프레임 주기(ms). (Ex: 60fps = 16.66ms, 30fps = 33.33ms) */
  private get frameIntervalMs() {
    return 1000 / this.quality.weatherFps
  }

  /** 브라우저 VSync 주기에 동기화되어 매 프레임 실행되는 메인 렌더 파이프라인. */
  private readonly renderFrame = (timestamp: number) => {
    // FPS 쓰로틀링: 목표 FPS 간격에 도달하지 않았으면 다음 VSync 틱으로 연기
    if (this.lastFrame && timestamp - this.lastFrame < this.frameIntervalMs) {
      this.animationFrameId = window.requestAnimationFrame(this.renderFrame)
      return
    }

    const canvas = this.canvasRef.value
    if (!canvas) {
      this.animationFrameId = 0
      return
    }

    // 캔버스 엘리먼트 감시 등록 (최초 1회만 수행됨)
    this.observeCanvas(canvas)

    const context = canvas.getContext('2d')
    if (!context) {
      this.animationFrameId = 0
      return
    }

    // Forced Reflow 방지: 리사이즈 옵저버에서 변경이 플래그된 경우에만 캔버스 버퍼 리사이징 실행
    if (this.isCanvasSizeDirty) {
      this.applyCanvasResize(canvas, this.canvasMetrics)
      this.isCanvasSizeDirty = false
    }

    // CSS 크기는 레이아웃 기준, 실제 canvas 픽셀은 devicePixelRatio 기준으로 맞춰 선명도를 유지합니다.
    const { width, height, pixelRatio } = this.canvasMetrics
    const state = this.getState()
    const mode = getPrecipitationMode(state)
    // 물리 시뮬레이션용 시간 변화량(dt): 탭 비활성화 후 복귀 시 대규모 점프를 방지하기 위해 최대 0.04초로 캡핑
    const dt = this.lastFrame ? Math.min(0.04, (timestamp - this.lastFrame) / 1000) : 0.016
    this.lastFrame = timestamp

    // 고해상도(Retina) 캔버스 배율 변환 매트릭스 적용 및 이전 프레임 잔상 소거
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, width, height)

    // 강수(비/눈) 파티클 물리 업데이트 및 드로잉
    if (mode) {
      // 강수량(0~12mm)을 0.0~1.0 단위 구간으로 정규화
      const intensity = clampToUnitInterval(state.precipitation / 12)
      // 풍속에 따른 입자 수평 밀림 가중치 (눈은 비보다 가벼우므로 1.55배 더 크게 밀림)
      const windOffset = clampToRange(state.windSpeed, 0, 28) * (mode === 'snow' ? 14 : 9)
      const baseWindVector = this.getWindScreenVector(state)

      // 눈보라는 실제 풍향보다 화면 수평 흐름을 더 강하게 섞어 whiteout 느낌을 만듭니다.
      const windVector =
        mode === 'snow' ? this.getSnowstormScreenVector(baseWindVector, getSnowstormIntensity(state)) : baseWindVector

      // 현재 날씨 강도에 맞춰 파티클 배열의 크기를 동기화
      this.syncParticles(width, height, state)
      context.lineCap = 'round'

      for (const particle of this.particles) {
        if (mode === 'snow') {
          const snowstormIntensity = getSnowstormIntensity(state)

          // 삼각함수 위상 누적: 바람이 셀수록 더 빠르게 요동치도록 각속도 가속
          particle.phase +=
            dt *
            CesiumMath.lerp(2.8, 5.6, clampToUnitInterval(state.windSpeed / 14)) *
            CesiumMath.lerp(1, 0.74, snowstormIntensity)

          // 눈송이 X축 이동 = (바람에 의한 밀림) + (고유 sin 파동 진동)
          particle.x +=
            (windVector.x * windOffset * CesiumMath.lerp(0.28, 0.66, snowstormIntensity) +
              Math.sin(particle.phase) * particle.drift * CesiumMath.lerp(1, 0.42, snowstormIntensity)) *
            dt

          // 눈송이 Y축 이동 = (자체 낙하 속도) + (수직 하향 풍속 성분)
          particle.y +=
            (particle.speed * CesiumMath.lerp(1, 0.72, snowstormIntensity) +
              windVector.y * windOffset * CesiumMath.lerp(0.16, 0.28, snowstormIntensity)) *
            dt
          this.drawSnowParticle(context, particle, windVector, windOffset, state)
        } else {
          // 빗방울 X축 이동: 바람 방향 벡터에 따른 전단 이동
          particle.x += windVector.x * windOffset * 0.62 * dt
          // 빗방울 Y축 이동: 고속 중력 낙하
          particle.y += (particle.speed + windVector.y * windOffset * 0.06) * dt

          this.drawRainParticle(context, particle, windVector, windOffset)
        }

        // 화면 밖으로 벗어난 입자는 가비지 컬렉션을 유발하지 않고 상단에 재배치
        if (particle.y > height + 40 || particle.x < -80 || particle.x > width + 80) {
          Object.assign(particle, this.createParticle(width, height, state, true))
        }
      }

      // 악천후 시 대기 명암 대비를 낮추고 전체적인 차폐감을 주기 위한 배경 오버레이 합성
      context.globalAlpha =
        mode === 'snow' ? CesiumMath.lerp(0.12, 0.3, intensity) : CesiumMath.lerp(0.04, 0.16, intensity)
      context.fillStyle = mode === 'snow' ? 'rgba(241, 245, 249, 0.34)' : 'rgba(8, 13, 25, 0.42)'
      context.fillRect(0, 0, width, height)
      context.globalAlpha = 1
    } else {
      this.particles = []
    }

    // 절차적 번개 시뮬레이션 및 렌더링
    this.drawLightning(context, timestamp, width, height, state)

    // 다음 프레임 루프 스케줄링
    this.animationFrameId = window.requestAnimationFrame(this.renderFrame)
  }

  /** 캔버스 요소에 ResizeObserver를 등록하여 윈도우 크기 변화를 레이아웃 스레드와 비동기로 격리 수신합니다. */
  private observeCanvas(canvas: HTMLCanvasElement) {
    if (this.observedCanvas === canvas) return

    this.disconnectResizeObserver()
    this.observedCanvas = canvas

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const clientWidth = canvas.clientWidth || window.innerWidth || 1
    const clientHeight = canvas.clientHeight || window.innerHeight || 1

    // 초기 마운트 시점의 기본 규격 산출 및 1회성 리사이징 플래그 활성화
    this.canvasMetrics = {
      width: Math.max(1, Math.floor(clientWidth)),
      height: Math.max(1, Math.floor(clientHeight)),
      pixelRatio,
    }
    this.isCanvasSizeDirty = true

    // 구형 브라우저 또는 SSR 환경 방어
    if (typeof ResizeObserver === 'undefined') return

    // 브라우저 레이아웃 엔진과 비동기로 동작하는 크기 변화 감지기 등록
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      // contentRect를 사용해 패딩/보더를 제외한 순수 콘텐츠 렌더 영역의 정수 픽셀 치수를 추출
      const nextWidth = Math.max(1, Math.floor(entry.contentRect.width))
      const nextHeight = Math.max(1, Math.floor(entry.contentRect.height))
      const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 2) // 고해상도 모니터 지원을 위한 픽셀 비율 갱신

      // 실제 픽셀 치수나 배율이 달라진 프레임에만 캐시를 갱신하고 Dirty 플래그를 세워 불필요한 버퍼 재할당 방지
      if (
        this.canvasMetrics.width !== nextWidth ||
        this.canvasMetrics.height !== nextHeight ||
        this.canvasMetrics.pixelRatio !== nextPixelRatio
      ) {
        this.canvasMetrics = {
          width: nextWidth,
          height: nextHeight,
          pixelRatio: nextPixelRatio,
        }
        this.isCanvasSizeDirty = true
      }
    })
    this.resizeObserver.observe(canvas)
  }

  /** 컴포넌트 해제 시 활성화된 ResizeObserver의 메모리 참조를 해제합니다. */
  private disconnectResizeObserver() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.observedCanvas = null
  }

  /**
   * 실제 HTMLCanvasElement의 렌더 버퍼(width, height)를 디바이스 픽셀 비율(DPR)에 맞춰 조정합니다.
   * (isCanvasSizeDirty가 true일 때만 호출되어 불필요한 버퍼 리셋을 방지함)
   */
  private applyCanvasResize(
    canvas: HTMLCanvasElement,
    { width, height, pixelRatio }: { width: number; height: number; pixelRatio: number },
  ) {
    const targetWidth = Math.floor(width * pixelRatio)
    const targetHeight = Math.floor(height * pixelRatio)

    // 실제 값이 다를 때만 버퍼를 리셋하여 깜빡임과 내부 재할당을 억제
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
    }

    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }

  /** 날씨 상태(강수량, 습도, 풍속 등)에 따라 계산된 적정 파티클 목표량에 맞춰 배열 크기를 동기화합니다. */
  private syncParticles(width: number, height: number, state: SceneWeatherState) {
    const targetCount = this.getTargetCount(state)

    // 부족한 입자는 추가 생성하여 메모리 풀 확장
    while (this.particles.length < targetCount) {
      this.particles.push(this.createParticle(width, height, state, true))
    }

    // 초과된 입자는 배열 길이를 줄여 축소
    if (this.particles.length > targetCount) {
      this.particles.length = targetCount
    }
  }

  /** 날씨 파라미터와 퀄리티 옵션을 반영하여 화면에 그려야 할 파티클 총량을 계산합니다. */
  private getTargetCount(state: SceneWeatherState) {
    const mode = getPrecipitationMode(state)
    if (!mode) return 0

    const intensity = clampToUnitInterval(state.precipitation / 12)
    const humidityBoost = CesiumMath.lerp(0.82, 1.18, clampToUnitInterval(state.humidity / 100))
    const windBoost = mode === 'snow' ? CesiumMath.lerp(1, 1.32, clampToUnitInterval(state.windSpeed / 14)) : 1
    const snowstormBoost = mode === 'snow' ? CesiumMath.lerp(1, 1.22, getSnowstormIntensity(state)) : 1

    // 기본 입자 수는 비/눈 모두 충분히 채우고, 강도에 따라 peakCount까지 보간합니다.
    const baseCount = 360
    const peakCount = mode === 'snow' ? 1550 : 1100

    return Math.round(
      CesiumMath.lerp(baseCount, peakCount, intensity) *
        humidityBoost *
        windBoost *
        snowstormBoost *
        this.quality.particleMultiplier,
    )
  }

  /** 렌더 루프 중단 시 캔버스를 투명하게 소거합니다. */
  private clearCanvas() {
    const canvas = this.canvasRef.value
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  /** 새로운 강수 파티클 속성(위치, 크기, 낙하 속도, 흔들림 진폭, 투명도 등)을 무작위 생성합니다. */
  private createParticle(width: number, height: number, state: SceneWeatherState, fromTop = false) {
    const mode = getPrecipitationMode(state)
    const intensity = clampToUnitInterval(state.precipitation / 12)
    const windFactor = clampToUnitInterval(state.windSpeed / 14)
    const snowstormIntensity = getSnowstormIntensity(state)
    const isSnow = mode === 'snow'

    return {
      x: Math.random() * width,
      // fromTop이 true면 화면 상단 외곽 영역(-Y)에 무작위로 배치하여 자연스럽게 하강 유입 유도
      y: fromTop ? -Math.random() * height * (isSnow ? 0.42 : 0.25) : Math.random() * height,
      // 눈: 폭설 시 굵은 함박눈과 미세 분진이 섞이도록 크기 무작위화, 비: 강수량에 따라 선 길이 8~24px 조절
      size: isSnow
        ? CesiumMath.lerp(
            1.5,
            CesiumMath.lerp(5.8, 7.6, intensity) * CesiumMath.lerp(1, 0.78, snowstormIntensity),
            Math.random(),
          )
        : CesiumMath.lerp(8, 24, intensity),
      // 눈: 초당 58~190px 낙하, 비: 초당 560~1240px의 고속 직하강
      speed: isSnow
        ? CesiumMath.lerp(58, 190, intensity) *
          CesiumMath.lerp(0.72, 1.58, Math.random()) *
          CesiumMath.lerp(1, 1.34, windFactor) *
          CesiumMath.lerp(1, 0.86, snowstormIntensity)
        : CesiumMath.lerp(560, 1240, intensity) * CesiumMath.lerp(0.72, 1.22, Math.random()),
      // 수평 흔들림 폭: 눈은 바람에 따라 42~86px까지 크게 흔들림
      drift:
        CesiumMath.lerp(-1, 1, Math.random()) *
        (isSnow ? CesiumMath.lerp(42, 86, windFactor) * CesiumMath.lerp(1, 0.62, snowstormIntensity) : 18),
      alpha: isSnow
        ? CesiumMath.lerp(0.52, CesiumMath.lerp(0.94, 1, intensity), Math.random()) *
          CesiumMath.lerp(1, 0.9, snowstormIntensity)
        : CesiumMath.lerp(0.24, 0.62, Math.random()),
      phase: Math.random() * Math.PI * 2,
    }
  }

  /** 기상학적 풍향 각도(바람이 불어오는 방위각 Degree)를 화면 공간 상의 진행 벡터로 변환합니다. */
  private getWindScreenVector(state: SceneWeatherState): WindScreenVector {
    const windFromRadians = CesiumMath.toRadians(state.windDirectionDegrees)
    const windToRadians = windFromRadians + Math.PI

    return {
      x: Math.sin(windToRadians),
      y: -Math.cos(windToRadians),
    }
  }

  /** 폭설 시 바람 벡터를 보정하여 횡풍(수평 블리자드) 효과를 극대화합니다. */
  private getSnowstormScreenVector(windVector: WindScreenVector, intensity: number) {
    const directionInfluence = intensity * 0.48
    const horizontalDirection = Math.abs(windVector.x) > 0.22 ? Math.sign(windVector.x) : windVector.y >= 0 ? 1 : -1

    return {
      x: CesiumMath.lerp(windVector.x, horizontalDirection, directionInfluence),
      y: CesiumMath.lerp(windVector.y, windVector.y * 0.45, directionInfluence),
    }
  }

  /** 바람의 전단(Shear) 각도를 반영한 사선 형태의 빗방울을 스트로크로 그립니다. */
  private drawRainParticle(
    context: CanvasRenderingContext2D,
    particle: ScreenWeatherParticle,
    windVector: WindScreenVector,
    windOffset: number,
  ) {
    context.globalAlpha = particle.alpha
    context.strokeStyle = 'rgba(191, 219, 254, 0.92)'
    context.lineWidth = Math.max(1, particle.size * 0.08)
    context.beginPath()
    context.moveTo(particle.x, particle.y)
    context.lineTo(
      particle.x - windVector.x * windOffset * 0.14,
      particle.y - particle.size - windVector.y * windOffset * 0.04,
    )
    context.stroke()
  }

  /** 원형 래디얼 그래디언트를 적용하여 빛이 부드럽게 퍼지는 눈송이를 그립니다. */
  private drawSnowParticle(
    context: CanvasRenderingContext2D,
    particle: ScreenWeatherParticle,
    windVector: WindScreenVector,
    windOffset: number,
    state: SceneWeatherState,
  ) {
    const snowstormIntensity = getSnowstormIntensity(state)
    const radius = particle.size

    // 저사양 프로필: 고비용 RadialGradient 생성을 생략하고 단색 원형으로 렌더링 최적화
    if (this.quality.simplifiedSnow) {
      context.globalAlpha = particle.alpha
      context.fillStyle = 'rgba(248, 250, 252, 0.82)'
      context.beginPath()
      context.arc(particle.x, particle.y, radius * 0.72, 0, Math.PI * 2)
      context.fill()
      return
    }

    // 눈송이 중심부는 밝고 외곽은 페이드아웃되는 포토메트릭 그래디언트 생성
    const gradient = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, radius)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.alpha})`)
    gradient.addColorStop(0.48, `rgba(248, 250, 252, ${particle.alpha * 0.66})`)
    gradient.addColorStop(1, 'rgba(226, 232, 240, 0.08)')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(particle.x, particle.y, radius, 0, Math.PI * 2)
    context.fill()

    // 강풍 또는 블리자드 발생 시 날리는 눈의 잔상 궤적(Streak) 추가 렌더링
    if (windOffset > 42 || snowstormIntensity > 0.08) {
      const streakLength = windOffset * CesiumMath.lerp(0.16, 0.38, snowstormIntensity)
      context.globalAlpha =
        particle.alpha * clampToUnitInterval(windOffset / 150) * CesiumMath.lerp(0.42, 0.68, snowstormIntensity)
      context.strokeStyle = 'rgba(241, 245, 249, 0.7)'
      context.lineWidth = Math.max(0.8, radius * CesiumMath.lerp(0.32, 0.52, snowstormIntensity))
      context.beginPath()
      context.moveTo(particle.x, particle.y)
      context.lineTo(particle.x - windVector.x * streakLength, particle.y - windVector.y * streakLength * 0.36)
      context.stroke()
    }
  }

  /** 중점 변위(Midpoint Displacement) 알고리즘 기반으로 프랙탈 형태의 번개 줄기 선분들을 생성합니다. */
  private createLightningSegments(width: number, height: number, intensity: number) {
    const segments: LightningSegment[] = []
    // 시작점: 화면 상단 중앙부 근처
    const startX = CesiumMath.lerp(width * 0.16, width * 0.84, Math.random())
    // 도달 목표점 Y: 화면 하단 지표면 부근
    const endY = CesiumMath.lerp(height * 0.46, height * 0.82, Math.random())
    // 뇌우가 강력할수록 더 촘촘하게 꺾이도록 분할 수(8~14) 증가
    const steps = Math.round(CesiumMath.lerp(8, 14, intensity))
    let previousX = startX
    let previousY = -height * CesiumMath.lerp(0.02, 0.14, Math.random())
    let branchBudget = Math.round(CesiumMath.lerp(1, 4, intensity))

    // 메인 번개 줄기를 위에서 아래로 진행시키고, 강도가 높을수록 가지를 더 자주 붙입니다.
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps
      // sin(progress * π): 번개 중간 지점에서 가장 넓게 퍼지고 끝점에서 다시 모여드는 포락선 생성
      const reach = Math.sin(progress * Math.PI)
      const nextX = startX + CesiumMath.lerp(-width * 0.16, width * 0.16, Math.random()) * (0.35 + reach)
      const nextY = CesiumMath.lerp(0, endY, progress)
      // 하단으로 내려갈수록 줄기가 가늘어지도록 스케일링
      const widthScale = CesiumMath.lerp(1, 0.28, progress)

      // 메인 번개 줄기 선분 등록
      segments.push({
        x1: previousX,
        y1: previousY,
        x2: nextX,
        y2: nextY,
        width: CesiumMath.lerp(4.8, 8.6, intensity) * widthScale,
        alpha: CesiumMath.lerp(0.96, 0.62, progress),
      })

      // 일정 확률로 메인 줄기에서 뻗어나가는 곁가지 번개 생성
      if (branchBudget > 0 && step > 2 && step < steps - 1 && Math.random() < 0.38 + intensity * 0.24) {
        const branchLength = CesiumMath.lerp(width * 0.08, width * 0.18, Math.random())
        const branchDirection = Math.random() < 0.5 ? -1 : 1
        const branchEndX = nextX + branchLength * branchDirection
        const branchEndY = nextY + CesiumMath.lerp(height * 0.05, height * 0.14, Math.random())

        segments.push({
          x1: nextX,
          y1: nextY,
          x2: branchEndX,
          y2: branchEndY,
          width: CesiumMath.lerp(1.4, 3.2, intensity),
          alpha: 0.54,
        })
        branchBudget -= 1
      }

      previousX = nextX
      previousY = nextY
    }

    return segments
  }

  /** 단일 번개 스트라이크 인스턴스를 인스턴스화합니다. */
  private createLightningStrike(timestamp: number, width: number, height: number, intensity: number) {
    return {
      bornAt: timestamp,
      duration: CesiumMath.lerp(520, 920, Math.random()),
      flash: CesiumMath.lerp(0.22, 0.5, intensity) * CesiumMath.lerp(0.72, 1.22, Math.random()),
      segments: this.createLightningSegments(width, height, intensity),
    }
  }

  /** 수명이 다한 번개를 정리하고, 확률적 주기에 따라 새로운 번개를 발동합니다. */
  private updateLightning(timestamp: number, width: number, height: number, intensity: number) {
    // 수명이 경과한 번개는 필터링하여 소멸
    this.lightningStrikes = this.lightningStrikes.filter((strike) => timestamp - strike.bornAt < strike.duration)

    if (intensity <= 0) {
      this.lightningStrikes = []
      this.nextLightningAt = 0
      return
    }

    // 다음 번개 발동 스케줄이 없으면 초기화
    if (!this.nextLightningAt) {
      this.nextLightningAt = timestamp + CesiumMath.lerp(240, 920, Math.random())
    }

    // 강한 뇌우일수록 다음 번개까지의 간격을 줄입니다.
    if (timestamp >= this.nextLightningAt) {
      this.lightningStrikes.push(this.createLightningStrike(timestamp, width, height, intensity))
      this.nextLightningAt =
        timestamp + CesiumMath.lerp(3600, 900, intensity) * CesiumMath.lerp(0.54, 1.36, Math.random())
    }
  }

  /** 번개 선분들과 전체 화면 번쩍임(Screen Flash)을 블렌딩 모드로 렌더링합니다. */
  private drawLightning(
    context: CanvasRenderingContext2D,
    timestamp: number,
    width: number,
    height: number,
    state: SceneWeatherState,
  ) {
    const intensity = getThunderstormIntensity(state)
    this.updateLightning(timestamp, width, height, intensity)

    if (!this.lightningStrikes.length) return

    let flashAlpha = 0
    context.save()
    // lighter 블렌딩: 겹치는 빛 픽셀들의 RGB 값을 산술 합산하여 중심부 고발광(Bloom) 연출
    context.globalCompositeOperation = 'lighter'
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (const strike of this.lightningStrikes) {
      const age = timestamp - strike.bornAt
      const progress = clampToUnitInterval(age / strike.duration)
      // sin 진동을 결합한 명멸(Flicker) 계수 산출
      const flicker = 0.72 + Math.sin(age * 0.08) * 0.28
      // smoothstep으로 수명 끝에서 부드럽게 감쇄
      const alpha = (1 - smoothstep(0.18, 1, progress)) * flicker
      flashAlpha += strike.flash * alpha

      for (const segment of strike.segments) {
        // 푸른색 외곽 후광(Glow) 렌더링 (굵고 반투명)
        context.globalAlpha = alpha * segment.alpha * 0.58
        context.strokeStyle = 'rgba(59, 130, 246, 0.9)'
        context.lineWidth = segment.width * 4.2
        context.beginPath()
        context.moveTo(segment.x1, segment.y1)
        context.lineTo(segment.x2, segment.y2)
        context.stroke()

        // 흰색 코어 번개선 렌더링 (가늘고 불투명)
        context.globalAlpha = alpha * segment.alpha
        context.strokeStyle = 'rgba(224, 242, 254, 0.98)'
        context.lineWidth = segment.width
        context.beginPath()
        context.moveTo(segment.x1, segment.y1)
        context.lineTo(segment.x2, segment.y2)
        context.stroke()
      }
    }

    context.restore()

    // 번개 발생 시 전체 화면을 순간적으로 밝히는 스크린 플래시 합성
    context.save()
    context.globalCompositeOperation = 'screen'
    context.globalAlpha = clampToRange(flashAlpha, 0, 0.42)
    context.fillStyle = 'rgba(219, 234, 254, 0.9)'
    context.fillRect(0, 0, width, height)
    context.restore()
  }
}
