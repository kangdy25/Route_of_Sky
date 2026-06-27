import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SceneWeatherState } from '../model/scene.types'
import { ScreenWeatherRenderer } from './screenWeather'

const baseState: SceneWeatherState = {
  time: 16.5,
  cloudCover: 35,
  precipitation: 0,
  aqi: 45,
  visibility: 15,
  temperature: 24.5,
  windSpeed: 5,
  windDirectionDegrees: 225,
  humidity: 62,
}

function createContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    lineCap: '',
    lineJoin: '',
    globalAlpha: 1,
    globalCompositeOperation: '',
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
  }
}

function createCanvas(context: ReturnType<typeof createContext> | null = createContext()) {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement
}

describe('화면 날씨 렌더러', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'setTimeout',
      vi.fn(() => 7),
    )
    vi.stubGlobal('clearTimeout', vi.fn())
    vi.stubGlobal('ResizeObserver', undefined)
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 320,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 180,
    })
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    })
  })

  it('강수가 있으면 애니메이션을 시작하고 중복 시작하지 않아야 한다', () => {
    const renderer = new ScreenWeatherRenderer(ref(createCanvas()), () => ({
      ...baseState,
      precipitation: 4,
    }))

    renderer.update()
    renderer.start()

    expect(window.setTimeout).toHaveBeenCalledTimes(1)
  })

  it('강수가 없으면 애니메이션과 캔버스를 정리해야 한다', () => {
    const context = createContext()
    const renderer = new ScreenWeatherRenderer(ref(createCanvas(context)), () => baseState)

    renderer.start()
    renderer.update()

    expect(window.clearTimeout).toHaveBeenCalledWith(7)
    expect(context.clearRect).toHaveBeenCalled()
  })

  it('실행 중인 animation frame이 없으면 stop이 취소 요청 없이 정리되어야 한다', () => {
    const renderer = new ScreenWeatherRenderer(ref(createCanvas()), () => baseState)

    renderer.stop()

    expect(window.clearTimeout).not.toHaveBeenCalled()
  })

  it('canvas나 context가 없으면 프레임을 중단해야 한다', () => {
    const missingCanvasRenderer = new ScreenWeatherRenderer(ref(null), () => baseState)
    const missingContextRenderer = new ScreenWeatherRenderer(
      ref(createCanvas(null)),
      () => baseState,
    )

    expect(() =>
      (missingCanvasRenderer as never as { renderFrame: (time: number) => void }).renderFrame(16),
    ).not.toThrow()
    expect(() =>
      (missingContextRenderer as never as { renderFrame: (time: number) => void }).renderFrame(16),
    ).not.toThrow()
  })

  it('비 입자를 그리고 화면 밖 입자는 재사용해야 한다', () => {
    const context = createContext()
    const canvas = createCanvas(context)
    const renderer = new ScreenWeatherRenderer(ref(canvas), () => ({
      ...baseState,
      precipitation: 6,
      windSpeed: 8,
    }))
    ;(renderer as never as { particles: Array<Record<string, number>> }).particles = [
      { x: 1000, y: 1000, size: 12, speed: 800, drift: 0, alpha: 0.5, phase: 0 },
    ]
    ;(renderer as never as { renderFrame: (time: number) => void }).renderFrame(16)

    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(360)
    expect(context.lineTo).toHaveBeenCalled()
    expect(context.fillRect).toHaveBeenCalled()
  })

  it('이미 canvas 크기가 맞으면 픽셀 크기를 다시 쓰지 않아야 한다', () => {
    const context = createContext()
    const canvas = createCanvas(context)
    canvas.width = 640
    canvas.height = 360
    const renderer = new ScreenWeatherRenderer(ref(canvas), () => ({
      ...baseState,
      precipitation: 4,
    }))

    ;(renderer as never as { renderFrame: (time: number) => void }).renderFrame(16)

    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(360)
  })

  it('두 번째 프레임부터는 이전 timestamp로 dt를 계산해야 한다', () => {
    const context = createContext()
    const renderer = new ScreenWeatherRenderer(ref(createCanvas(context)), () => ({
      ...baseState,
      precipitation: 4,
    }))

    ;(renderer as never as { renderFrame: (time: number) => void }).renderFrame(16)
    ;(renderer as never as { renderFrame: (time: number) => void }).renderFrame(50)

    expect(context.clearRect).toHaveBeenCalledTimes(2)
  })

  it('너무 가까운 animation frame은 그리기를 건너뛰어야 한다', () => {
    const context = createContext()
    const renderer = new ScreenWeatherRenderer(ref(createCanvas(context)), () => ({
      ...baseState,
      precipitation: 4,
    }))

    ;(renderer as never as { renderFrame: (time: number) => void }).renderFrame(16)
    ;(renderer as never as { renderFrame: (time: number) => void }).renderFrame(32)

    expect(context.clearRect).toHaveBeenCalledTimes(1)
    expect(window.setTimeout).toHaveBeenCalledTimes(2)
  })

  it('devicePixelRatio가 없으면 1배율로 canvas를 맞춰야 한다', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 0,
    })
    const canvas = createCanvas(createContext())
    const renderer = new ScreenWeatherRenderer(ref(canvas), () => ({
      ...baseState,
      precipitation: 4,
    }))

    ;(renderer as never as { renderFrame: (time: number) => void }).renderFrame(16)

    expect(canvas.width).toBe(320)
    expect(canvas.height).toBe(180)
  })

  it('눈 입자와 강풍 streak를 그려야 한다', () => {
    const context = createContext()
    const renderer = new ScreenWeatherRenderer(ref(createCanvas(context)), () => ({
      ...baseState,
      precipitation: 12,
      temperature: -4,
      windSpeed: 17,
      humidity: 100,
    }))
    ;(renderer as never as { particles: Array<Record<string, number>> }).particles = [
      { x: 50, y: 30, size: 4, speed: 90, drift: 12, alpha: 0.8, phase: 0 },
    ]
    ;(renderer as never as { renderFrame: (time: number) => void }).renderFrame(16)

    expect(context.createRadialGradient).toHaveBeenCalled()
    expect(context.arc).toHaveBeenCalled()
    expect(context.stroke).toHaveBeenCalled()
  })

  it('강한 뇌우에서는 번개를 생성하고 그려야 한다', () => {
    const context = createContext()
    const renderer = new ScreenWeatherRenderer(ref(createCanvas(context)), () => baseState)
    const stormState = {
      ...baseState,
      precipitation: 16,
      cloudCover: 100,
      humidity: 100,
    }
    ;(renderer as never as { nextLightningAt: number }).nextLightningAt = 1
    ;(
      renderer as never as {
        drawLightning: (
          context: ReturnType<typeof createContext>,
          timestamp: number,
          width: number,
          height: number,
          state: SceneWeatherState,
        ) => void
      }
    ).drawLightning(context, 1000, 320, 180, stormState)

    expect(context.save).toHaveBeenCalled()
    expect(context.stroke).toHaveBeenCalled()
    expect(context.restore).toHaveBeenCalled()
  })

  it('번개 가지가 오른쪽으로 뻗는 경로도 만들 수 있어야 한다', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.6)
    const renderer = new ScreenWeatherRenderer(ref(createCanvas()), () => baseState)

    const segments = (
      renderer as never as {
        createLightningSegments: (
          width: number,
          height: number,
          intensity: number,
        ) => Array<{ x1: number; x2: number; alpha: number }>
      }
    ).createLightningSegments(320, 180, 1)

    expect(segments.some((segment) => segment.alpha === 0.54 && segment.x2 > segment.x1)).toBe(true)
    randomSpy.mockRestore()
  })

  it('번개 가지가 왼쪽으로 뻗는 경로도 만들 수 있어야 한다', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4)
    const renderer = new ScreenWeatherRenderer(ref(createCanvas()), () => baseState)

    const segments = (
      renderer as never as {
        createLightningSegments: (
          width: number,
          height: number,
          intensity: number,
        ) => Array<{ x1: number; x2: number; alpha: number }>
      }
    ).createLightningSegments(320, 180, 1)

    expect(segments.some((segment) => segment.alpha === 0.54 && segment.x2 < segment.x1)).toBe(true)
    randomSpy.mockRestore()
  })

  it('강수가 없는 프레임에서는 입자 목록을 비워야 한다', () => {
    const context = createContext()
    const renderer = new ScreenWeatherRenderer(ref(createCanvas(context)), () => baseState)
    ;(renderer as never as { particles: Array<Record<string, number>> }).particles = [
      { x: 1, y: 1, size: 1, speed: 1, drift: 1, alpha: 1, phase: 1 },
    ]
    ;(renderer as never as { renderFrame: (time: number) => void }).renderFrame(16)

    expect((renderer as never as { particles: unknown[] }).particles).toHaveLength(0)
  })

  it('대상 입자 수보다 많으면 기존 입자 배열을 줄여야 한다', () => {
    const renderer = new ScreenWeatherRenderer(ref(createCanvas()), () => baseState)
    ;(renderer as never as { particles: Array<Record<string, number>> }).particles = [
      { x: 1, y: 1, size: 1, speed: 1, drift: 1, alpha: 1, phase: 1 },
    ]
    ;(
      renderer as never as {
        syncParticles: (width: number, height: number, state: SceneWeatherState) => void
      }
    ).syncParticles(320, 180, baseState)

    expect((renderer as never as { particles: unknown[] }).particles).toHaveLength(0)
  })

  it('캔버스가 없으면 clearCanvas가 조용히 종료되어야 한다', () => {
    const renderer = new ScreenWeatherRenderer(ref(null), () => baseState)

    expect(() => (renderer as never as { clearCanvas: () => void }).clearCanvas()).not.toThrow()
  })

  it('중간 위치에서 시작하는 입자를 만들 수 있어야 한다', () => {
    const renderer = new ScreenWeatherRenderer(ref(createCanvas()), () => baseState)
    const particle = (
      renderer as never as {
        createParticle: (
          width: number,
          height: number,
          state: SceneWeatherState,
          fromTop?: boolean,
        ) => { y: number }
      }
    ).createParticle(320, 180, { ...baseState, precipitation: 4 }, false)

    expect(particle.y).toBeGreaterThanOrEqual(0)
  })

  it('눈보라 화면 벡터는 수직 풍향일 때 y 방향으로 수평 방향을 정해야 한다', () => {
    const renderer = new ScreenWeatherRenderer(ref(createCanvas()), () => baseState)
    const vector = (
      renderer as never as {
        getSnowstormScreenVector: (
          windVector: { x: number; y: number },
          intensity: number,
        ) => { x: number; y: number }
      }
    ).getSnowstormScreenVector({ x: 0.1, y: -1 }, 1)

    expect(vector.x).toBeLessThan(0.1)
  })

  it('눈보라 화면 벡터는 아래 방향 풍향일 때 양의 수평 방향을 정해야 한다', () => {
    const renderer = new ScreenWeatherRenderer(ref(createCanvas()), () => baseState)
    const vector = (
      renderer as never as {
        getSnowstormScreenVector: (
          windVector: { x: number; y: number },
          intensity: number,
        ) => { x: number; y: number }
      }
    ).getSnowstormScreenVector({ x: 0.1, y: 1 }, 1)

    expect(vector.x).toBeGreaterThan(0.1)
  })

  it('약한 눈은 streak 없이 입자만 그려야 한다', () => {
    const context = createContext()
    const renderer = new ScreenWeatherRenderer(ref(createCanvas(context)), () => ({
      ...baseState,
      precipitation: 3,
      temperature: -2,
      windSpeed: 1,
    }))
    ;(renderer as never as { particles: Array<Record<string, number>> }).particles = [
      { x: 50, y: 30, size: 4, speed: 90, drift: 12, alpha: 0.8, phase: 0 },
    ]
    ;(renderer as never as { renderFrame: (time: number) => void }).renderFrame(16)

    expect(context.arc).toHaveBeenCalled()
  })

  it('번개 강도가 없으면 기존 번개와 예약 시간을 초기화해야 한다', () => {
    const renderer = new ScreenWeatherRenderer(ref(createCanvas()), () => baseState)
    ;(renderer as never as { nextLightningAt: number }).nextLightningAt = 100
    ;(renderer as never as { lightningStrikes: Array<Record<string, number>> }).lightningStrikes = [
      { bornAt: 0, duration: 1000, flash: 1, segments: [] },
    ]
    ;(
      renderer as never as {
        updateLightning: (
          timestamp: number,
          width: number,
          height: number,
          intensity: number,
        ) => void
      }
    ).updateLightning(50, 320, 180, 0)

    expect((renderer as never as { nextLightningAt: number }).nextLightningAt).toBe(0)
    expect((renderer as never as { lightningStrikes: unknown[] }).lightningStrikes).toHaveLength(0)
  })

  it('번개 강도가 있을 때 다음 번개 예약 시간이 없으면 먼저 예약해야 한다', () => {
    const renderer = new ScreenWeatherRenderer(ref(createCanvas()), () => baseState)

    ;(
      renderer as never as {
        updateLightning: (
          timestamp: number,
          width: number,
          height: number,
          intensity: number,
        ) => void
      }
    ).updateLightning(50, 320, 180, 0.5)

    expect((renderer as never as { nextLightningAt: number }).nextLightningAt).toBeGreaterThan(50)
  })
})
