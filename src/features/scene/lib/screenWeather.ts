import { Math as CesiumMath } from 'cesium'
import type { Ref } from 'vue'

import type { SceneWeatherState } from '../model/scene.types'
import { clampToRange, clampToUnitInterval, smoothstep } from './math'
import { getPrecipitationMode, getSnowstormIntensity, getThunderstormIntensity } from './weather'

// 화면 공간의 비, 눈, 번개를 2D canvas에 그립니다.
// Cesium scene에 입자를 넣지 않아도 UI 위에서 빠르게 날씨 효과를 바꿀 수 있습니다.
interface ScreenWeatherParticle {
  x: number
  y: number
  size: number
  speed: number
  drift: number
  alpha: number
  phase: number
}

interface WindScreenVector {
  x: number
  y: number
}

interface LightningSegment {
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  alpha: number
}

interface LightningStrike {
  bornAt: number
  duration: number
  flash: number
  segments: LightningSegment[]
}

export class ScreenWeatherRenderer {
  private animationFrame = 0
  private lastFrame = 0
  private particles: ScreenWeatherParticle[] = []
  private lightningStrikes: LightningStrike[] = []
  private nextLightningAt = 0
  private readonly canvasRef: Ref<HTMLCanvasElement | null>
  private readonly getState: () => SceneWeatherState

  constructor(canvasRef: Ref<HTMLCanvasElement | null>, getState: () => SceneWeatherState) {
    this.canvasRef = canvasRef
    this.getState = getState
  }

  update() {
    if (getPrecipitationMode(this.getState())) {
      this.start()
      return
    }

    this.stop()
  }

  start() {
    if (this.animationFrame) return

    this.lastFrame = 0
    this.animationFrame = window.requestAnimationFrame(this.renderFrame)
  }

  stop() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame)
    }

    this.animationFrame = 0
    this.lastFrame = 0
    this.particles = []
    this.lightningStrikes = []
    this.nextLightningAt = 0
    this.clearCanvas()
  }

  private readonly renderFrame = (timestamp: number) => {
    const canvas = this.canvasRef.value
    if (!canvas) {
      this.animationFrame = 0
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      this.animationFrame = 0
      return
    }

    // CSS 크기는 레이아웃 기준, 실제 canvas 픽셀은 devicePixelRatio 기준으로 맞춰 선명도를 유지합니다.
    const { width, height, pixelRatio } = this.resizeCanvas(canvas)
    const state = this.getState()
    const mode = getPrecipitationMode(state)
    const dt = this.lastFrame ? Math.min(0.04, (timestamp - this.lastFrame) / 1000) : 0.016
    this.lastFrame = timestamp

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, width, height)

    if (mode) {
      const intensity = clampToUnitInterval(state.precipitation / 12)
      const windOffset = clampToRange(state.windSpeed, 0, 28) * (mode === 'snow' ? 14 : 9)
      const baseWindVector = this.getWindScreenVector(state)
      // 눈보라는 실제 풍향보다 화면 수평 흐름을 더 강하게 섞어 whiteout 느낌을 만듭니다.
      const windVector =
        mode === 'snow'
          ? this.getSnowstormScreenVector(baseWindVector, getSnowstormIntensity(state))
          : baseWindVector
      this.syncParticles(width, height, state)
      context.lineCap = 'round'

      for (const particle of this.particles) {
        if (mode === 'snow') {
          const snowstormIntensity = getSnowstormIntensity(state)
          particle.phase +=
            dt *
            CesiumMath.lerp(2.8, 5.6, clampToUnitInterval(state.windSpeed / 14)) *
            CesiumMath.lerp(1, 0.74, snowstormIntensity)
          particle.x +=
            (windVector.x * windOffset * CesiumMath.lerp(0.28, 0.66, snowstormIntensity) +
              Math.sin(particle.phase) *
                particle.drift *
                CesiumMath.lerp(1, 0.42, snowstormIntensity)) *
            dt
          particle.y +=
            (particle.speed * CesiumMath.lerp(1, 0.72, snowstormIntensity) +
              windVector.y * windOffset * CesiumMath.lerp(0.16, 0.28, snowstormIntensity)) *
            dt
          this.drawSnowParticle(context, particle, windVector, windOffset, state)
        } else {
          particle.x += windVector.x * windOffset * 0.62 * dt
          particle.y += (particle.speed + windVector.y * windOffset * 0.06) * dt
          this.drawRainParticle(context, particle, windVector, windOffset)
        }

        if (particle.y > height + 40 || particle.x < -80 || particle.x > width + 80) {
          // 화면 밖으로 나간 입자는 새 객체를 만들기보다 재사용해 프레임 중 GC 부담을 줄입니다.
          Object.assign(particle, this.createParticle(width, height, state, true))
        }
      }

      context.globalAlpha =
        mode === 'snow'
          ? CesiumMath.lerp(0.12, 0.3, intensity)
          : CesiumMath.lerp(0.04, 0.16, intensity)
      context.fillStyle = mode === 'snow' ? 'rgba(241, 245, 249, 0.34)' : 'rgba(8, 13, 25, 0.42)'
      context.fillRect(0, 0, width, height)
      context.globalAlpha = 1
    } else {
      this.particles = []
    }

    this.drawLightning(context, timestamp, width, height, state)

    this.animationFrame = window.requestAnimationFrame(this.renderFrame)
  }

  private resizeCanvas(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))
    const targetWidth = Math.floor(width * pixelRatio)
    const targetHeight = Math.floor(height * pixelRatio)

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
    }

    return { width, height, pixelRatio }
  }

  private syncParticles(width: number, height: number, state: SceneWeatherState) {
    const targetCount = this.getTargetCount(state)

    while (this.particles.length < targetCount) {
      this.particles.push(this.createParticle(width, height, state, true))
    }

    if (this.particles.length > targetCount) {
      this.particles.length = targetCount
    }
  }

  private getTargetCount(state: SceneWeatherState) {
    const mode = getPrecipitationMode(state)
    if (!mode) return 0

    const intensity = clampToUnitInterval(state.precipitation / 12)
    const humidityBoost = CesiumMath.lerp(0.82, 1.18, clampToUnitInterval(state.humidity / 100))
    const windBoost =
      mode === 'snow' ? CesiumMath.lerp(1, 1.32, clampToUnitInterval(state.windSpeed / 14)) : 1
    const snowstormBoost =
      mode === 'snow' ? CesiumMath.lerp(1, 1.22, getSnowstormIntensity(state)) : 1
    // 기본 입자 수는 비/눈 모두 충분히 채우고, 강도에 따라 peakCount까지 보간합니다.
    const baseCount = 360
    const peakCount = mode === 'snow' ? 1550 : 1100

    return Math.round(
      CesiumMath.lerp(baseCount, peakCount, intensity) * humidityBoost * windBoost * snowstormBoost,
    )
  }

  private clearCanvas() {
    const canvas = this.canvasRef.value
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  private createParticle(width: number, height: number, state: SceneWeatherState, fromTop = false) {
    const mode = getPrecipitationMode(state)
    const intensity = clampToUnitInterval(state.precipitation / 12)
    const windFactor = clampToUnitInterval(state.windSpeed / 14)
    const snowstormIntensity = getSnowstormIntensity(state)
    const isSnow = mode === 'snow'

    return {
      x: Math.random() * width,
      y: fromTop ? -Math.random() * height * (isSnow ? 0.42 : 0.25) : Math.random() * height,
      size: isSnow
        ? CesiumMath.lerp(
            1.5,
            CesiumMath.lerp(5.8, 7.6, intensity) * CesiumMath.lerp(1, 0.78, snowstormIntensity),
            Math.random(),
          )
        : CesiumMath.lerp(8, 24, intensity),
      speed: isSnow
        ? CesiumMath.lerp(58, 190, intensity) *
          CesiumMath.lerp(0.72, 1.58, Math.random()) *
          CesiumMath.lerp(1, 1.34, windFactor) *
          CesiumMath.lerp(1, 0.86, snowstormIntensity)
        : CesiumMath.lerp(560, 1240, intensity) * CesiumMath.lerp(0.72, 1.22, Math.random()),
      drift:
        CesiumMath.lerp(-1, 1, Math.random()) *
        (isSnow
          ? CesiumMath.lerp(42, 86, windFactor) * CesiumMath.lerp(1, 0.62, snowstormIntensity)
          : 18),
      alpha: isSnow
        ? CesiumMath.lerp(0.52, CesiumMath.lerp(0.94, 1, intensity), Math.random()) *
          CesiumMath.lerp(1, 0.9, snowstormIntensity)
        : CesiumMath.lerp(0.24, 0.62, Math.random()),
      phase: Math.random() * Math.PI * 2,
    }
  }

  private getWindScreenVector(state: SceneWeatherState): WindScreenVector {
    const windFromRadians = CesiumMath.toRadians(state.windDirectionDegrees)
    const windToRadians = windFromRadians + Math.PI

    return {
      x: Math.sin(windToRadians),
      y: -Math.cos(windToRadians),
    }
  }

  private getSnowstormScreenVector(windVector: WindScreenVector, intensity: number) {
    const directionInfluence = intensity * 0.48
    const horizontalDirection =
      Math.abs(windVector.x) > 0.22 ? Math.sign(windVector.x) : windVector.y >= 0 ? 1 : -1

    return {
      x: CesiumMath.lerp(windVector.x, horizontalDirection, directionInfluence),
      y: CesiumMath.lerp(windVector.y, windVector.y * 0.45, directionInfluence),
    }
  }

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

  private drawSnowParticle(
    context: CanvasRenderingContext2D,
    particle: ScreenWeatherParticle,
    windVector: WindScreenVector,
    windOffset: number,
    state: SceneWeatherState,
  ) {
    const snowstormIntensity = getSnowstormIntensity(state)
    const radius = particle.size
    const gradient = context.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      radius,
    )
    gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.alpha})`)
    gradient.addColorStop(0.48, `rgba(248, 250, 252, ${particle.alpha * 0.66})`)
    gradient.addColorStop(1, 'rgba(226, 232, 240, 0.08)')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(particle.x, particle.y, radius, 0, Math.PI * 2)
    context.fill()

    if (windOffset > 42 || snowstormIntensity > 0.08) {
      const streakLength = windOffset * CesiumMath.lerp(0.16, 0.38, snowstormIntensity)
      context.globalAlpha =
        particle.alpha *
        clampToUnitInterval(windOffset / 150) *
        CesiumMath.lerp(0.42, 0.68, snowstormIntensity)
      context.strokeStyle = 'rgba(241, 245, 249, 0.7)'
      context.lineWidth = Math.max(0.8, radius * CesiumMath.lerp(0.32, 0.52, snowstormIntensity))
      context.beginPath()
      context.moveTo(particle.x, particle.y)
      context.lineTo(
        particle.x - windVector.x * streakLength,
        particle.y - windVector.y * streakLength * 0.36,
      )
      context.stroke()
    }
  }

  private createLightningSegments(width: number, height: number, intensity: number) {
    const segments: LightningSegment[] = []
    const startX = CesiumMath.lerp(width * 0.16, width * 0.84, Math.random())
    const endY = CesiumMath.lerp(height * 0.46, height * 0.82, Math.random())
    const steps = Math.round(CesiumMath.lerp(8, 14, intensity))
    let previousX = startX
    let previousY = -height * CesiumMath.lerp(0.02, 0.14, Math.random())
    let branchBudget = Math.round(CesiumMath.lerp(1, 4, intensity))

    // 메인 번개 줄기를 위에서 아래로 진행시키고, 강도가 높을수록 가지를 더 자주 붙입니다.
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps
      const reach = Math.sin(progress * Math.PI)
      const nextX =
        startX + CesiumMath.lerp(-width * 0.16, width * 0.16, Math.random()) * (0.35 + reach)
      const nextY = CesiumMath.lerp(0, endY, progress)
      const widthScale = CesiumMath.lerp(1, 0.28, progress)

      segments.push({
        x1: previousX,
        y1: previousY,
        x2: nextX,
        y2: nextY,
        width: CesiumMath.lerp(4.8, 8.6, intensity) * widthScale,
        alpha: CesiumMath.lerp(0.96, 0.62, progress),
      })

      if (
        branchBudget > 0 &&
        step > 2 &&
        step < steps - 1 &&
        Math.random() < 0.38 + intensity * 0.24
      ) {
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

  private createLightningStrike(
    timestamp: number,
    width: number,
    height: number,
    intensity: number,
  ) {
    return {
      bornAt: timestamp,
      duration: CesiumMath.lerp(520, 920, Math.random()),
      flash: CesiumMath.lerp(0.22, 0.5, intensity) * CesiumMath.lerp(0.72, 1.22, Math.random()),
      segments: this.createLightningSegments(width, height, intensity),
    }
  }

  private updateLightning(timestamp: number, width: number, height: number, intensity: number) {
    this.lightningStrikes = this.lightningStrikes.filter(
      (strike) => timestamp - strike.bornAt < strike.duration,
    )

    if (intensity <= 0) {
      this.lightningStrikes = []
      this.nextLightningAt = 0
      return
    }

    if (!this.nextLightningAt) {
      this.nextLightningAt = timestamp + CesiumMath.lerp(240, 920, Math.random())
    }

    if (timestamp >= this.nextLightningAt) {
      this.lightningStrikes.push(this.createLightningStrike(timestamp, width, height, intensity))
      // 강한 뇌우일수록 다음 번개까지의 간격을 줄입니다.
      this.nextLightningAt =
        timestamp +
        CesiumMath.lerp(3600, 900, intensity) * CesiumMath.lerp(0.54, 1.36, Math.random())
    }
  }

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
    // lighter 합성으로 푸른 외곽광과 흰 코어가 겹칠 때 번쩍임이 살아나게 합니다.
    context.globalCompositeOperation = 'lighter'
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (const strike of this.lightningStrikes) {
      const age = timestamp - strike.bornAt
      const progress = clampToUnitInterval(age / strike.duration)
      const flicker = 0.72 + Math.sin(age * 0.08) * 0.28
      const alpha = (1 - smoothstep(0.18, 1, progress)) * flicker
      flashAlpha += strike.flash * alpha

      for (const segment of strike.segments) {
        context.globalAlpha = alpha * segment.alpha * 0.58
        context.strokeStyle = 'rgba(59, 130, 246, 0.9)'
        context.lineWidth = segment.width * 4.2
        context.beginPath()
        context.moveTo(segment.x1, segment.y1)
        context.lineTo(segment.x2, segment.y2)
        context.stroke()

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

    context.save()
    context.globalCompositeOperation = 'screen'
    context.globalAlpha = clampToRange(flashAlpha, 0, 0.42)
    context.fillStyle = 'rgba(219, 234, 254, 0.9)'
    context.fillRect(0, 0, width, height)
    context.restore()
  }
}
