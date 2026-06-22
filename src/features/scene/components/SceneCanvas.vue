<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import {
  CameraEventType,
  Cartesian2,
  Cartesian3,
  Cesium3DTileset,
  ClockRange,
  CloudCollection,
  Color,
  CumulusCloud,
  DynamicAtmosphereLightingType,
  Ion,
  JulianDate,
  KeyboardEventModifier,
  Matrix3,
  Math as CesiumMath,
  PostProcessStage,
  PostProcessStageSampleMode,
  SceneTransforms,
  Simon1994PlanetaryPositions,
  SunLight,
  Transforms,
  Viewer,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { cesiumIonAccessToken, hasCesiumIonAccessToken } from '@/shared/config/env'

const GOOGLE_3D_TILES_ION_ASSET_ID = 2275207
const SEOUL_TIMEZONE_OFFSET_HOURS = -9
const SCENE_DATE = {
  year: 2026,
  monthIndex: 5,
  day: 20,
}
const SEOUL_JAMSIL_VIEW = {
  longitude: 127.1026,
  latitude: 37.5125,
  height: 1750,
  headingDegrees: 314,
  pitchDegrees: -42,
}
const SEOUL_SUMMER_SOLAR = {
  sunriseStart: 4.5,
  sunrise: 5.15,
  solarNoon: 12.55,
  sunset: 19.95,
  duskEnd: 20.65,
}
const CLOUD_LOD = {
  minimumCover: 8,
  maxClouds: 34,
  altitude: 1550,
  longitudeSpan: 0.11,
  latitudeSpan: 0.08,
}
const PRECIPITATION_MODE_THRESHOLD = 0.05
const WEATHER_POST_PROCESS_STAGE_NAME = 'route-of-sky-weather-grade'

interface CameraWaypoint {
  longitude: number
  latitude: number
  height?: number
  headingDegrees?: number
  pitchDegrees?: number
  rollDegrees?: number
  duration?: number
}

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

const props = withDefaults(
  defineProps<{
    time?: number
    cloudCover?: number
    precipitation?: number
    aqi?: number
    visibility?: number
    temperature?: number
    windSpeed?: number
    windDirectionDegrees?: number
    humidity?: number
  }>(),
  {
    time: 16.5,
    cloudCover: 65,
    precipitation: 0.0,
    aqi: 45,
    visibility: 15.0,
    temperature: 18,
    windSpeed: 3.2,
    windDirectionDegrees: 225,
    humidity: 62,
  },
)

const cesiumContainer = ref<HTMLDivElement | null>(null)
const precipitationCanvas = ref<HTMLCanvasElement | null>(null)
const isTilesLoading = ref(false)
const statusMessage = ref('')
const sunGlowStyle = ref<Record<string, string | number>>({ opacity: 0 })

let viewer: Viewer | null = null
let activeCameraTween: gsap.core.Tween | null = null
let removeSunGlowUpdater: (() => void) | null = null
let destroyed = false
let cloudCollection: CloudCollection | null = null
let weatherPostProcessStage: PostProcessStage | null = null
let screenWeatherAnimationFrame = 0
let lastScreenWeatherFrame = 0
let screenWeatherParticles: ScreenWeatherParticle[] = []
const sunTransformScratch = new Matrix3()
const sunPositionScratch = new Cartesian3()
const sunWindowScratch = new Cartesian2()
const sunToCameraScratch = new Cartesian3()

const atmosphereOverlayStyle = computed(() => {
  const sky = getSkyPhase(props.time)
  const cloudAlpha = Math.min(0.34, Math.max(0.04, props.cloudCover / 280))
  const rainAlpha = Math.min(0.22, Math.max(0, props.precipitation / 360))
  const hazeAlpha = Math.min(0.28, Math.max(0.02, (20 - props.visibility) / 80 + props.aqi / 900))
  const dustAlpha = CesiumMath.lerp(0, 0.2, clamp01((props.aqi - 80) / 180))
  const dimFactor = CesiumMath.lerp(0.92, 0.42, sky.daylight)

  return {
    background: `radial-gradient(circle at 50% 35%, rgba(34, 211, 238, ${0.04 + sky.daylight * 0.04}), rgba(2, 6, 23, ${0.16 * dimFactor}) 52%, rgba(2, 6, 23, ${0.48 * dimFactor}) 100%), linear-gradient(180deg, rgba(120, 86, 28, ${dustAlpha * 0.55}) 0%, rgba(161, 98, 7, ${dustAlpha}) 58%, rgba(92, 64, 24, ${dustAlpha * 0.75}) 100%), linear-gradient(180deg, rgba(15, 23, 42, ${cloudAlpha * dimFactor}) 0%, rgba(8, 13, 25, ${(rainAlpha + 0.12) * dimFactor}) 52%, rgba(2, 6, 23, ${(hazeAlpha + 0.2) * dimFactor}) 100%)`,
  }
})

const skyTimeStyle = computed(() => {
  const sky = getSkyPhase(props.time)
  const dawnWarmth = sky.dawn + sky.dusk
  const nightOpacity = 1 - sky.daylight
  const dayBlue = 0.28 + sky.daylight * 0.42
  const horizonWarmth = 0.12 + dawnWarmth * 0.58

  return {
    opacity: CesiumMath.lerp(0.66, 0.88, sky.daylight),
    background: `radial-gradient(ellipse at 50% 82%, rgba(251, 146, 60, ${horizonWarmth}), rgba(245, 158, 11, ${dawnWarmth * 0.28}) 30%, rgba(180, 83, 9, ${dawnWarmth * 0.12}) 54%, transparent 72%), linear-gradient(180deg, rgba(56, 189, 248, ${dayBlue}) 0%, rgba(125, 211, 252, ${0.12 + sky.daylight * 0.18}) 32%, rgba(252, 211, 77, ${dawnWarmth * 0.2}) 56%, rgba(249, 115, 22, ${dawnWarmth * 0.22}) 74%, rgba(15, 23, 42, ${0.72 * nightOpacity}) 100%)`,
  }
})

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function getSkyPhase(time: number) {
  const localTime = ((time % 24) + 24) % 24
  const solar = SEOUL_SUMMER_SOLAR
  const morningLight = smoothstep(solar.sunriseStart, solar.sunrise + 0.8, localTime)
  const eveningFade = 1 - smoothstep(solar.sunset - 1.0, solar.duskEnd, localTime)
  const daylight = clamp01(morningLight * eveningFade)
  const dawn = clamp01(1 - Math.abs(localTime - solar.sunrise) / 1.65)
  const dusk = clamp01(1 - Math.abs(localTime - solar.sunset) / 1.8)
  const horizonGlow = Math.max(dawn, dusk)

  return {
    daylight,
    dawn,
    dusk,
    horizonGlow,
  }
}

function getSceneDateFromLocalTime(time: number) {
  const hour = Math.floor(time)
  const minutes = Math.round((time - hour) * 60)

  return new Date(
    Date.UTC(
      SCENE_DATE.year,
      SCENE_DATE.monthIndex,
      SCENE_DATE.day,
      hour + SEOUL_TIMEZONE_OFFSET_HOURS,
      minutes,
    ),
  )
}

function getSunPositionForTime(time: JulianDate, result: Cartesian3) {
  const transform =
    Transforms.computeIcrfToCentralBodyFixedMatrix(time, sunTransformScratch) ??
    Transforms.computeTemeToPseudoFixedMatrix(time, sunTransformScratch)
  const inertialPosition = Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(
    time,
    result,
  )

  return Matrix3.multiplyByVector(transform, inertialPosition, result)
}

function getPrecipitationMode() {
  if (props.precipitation <= PRECIPITATION_MODE_THRESHOLD) return null
  return props.temperature <= 0 ? 'snow' : 'rain'
}

function getScreenWeatherTargetCount() {
  const mode = getPrecipitationMode()
  if (!mode) return 0

  const intensity = clamp01(props.precipitation / 12)
  const humidityBoost = CesiumMath.lerp(0.82, 1.18, clamp01(props.humidity / 100))
  const windBoost = mode === 'snow' ? CesiumMath.lerp(1, 1.32, clamp01(props.windSpeed / 14)) : 1
  const baseCount = mode === 'snow' ? 360 : 360
  const peakCount = mode === 'snow' ? 1480 : 1100

  return Math.round(CesiumMath.lerp(baseCount, peakCount, intensity) * humidityBoost * windBoost)
}

function createScreenWeatherParticle(width: number, height: number, fromTop = false) {
  const mode = getPrecipitationMode()
  const intensity = clamp01(props.precipitation / 12)
  const windFactor = clamp01(props.windSpeed / 14)
  const isSnow = mode === 'snow'

  return {
    x: Math.random() * width,
    y: fromTop ? -Math.random() * height * (isSnow ? 0.42 : 0.25) : Math.random() * height,
    size: isSnow
      ? CesiumMath.lerp(1.8, CesiumMath.lerp(5.8, 7.2, intensity), Math.random())
      : CesiumMath.lerp(8, 24, intensity),
    speed: isSnow
      ? CesiumMath.lerp(58, 190, intensity) *
        CesiumMath.lerp(0.72, 1.58, Math.random()) *
        CesiumMath.lerp(1, 1.34, windFactor)
      : CesiumMath.lerp(560, 1240, intensity) * CesiumMath.lerp(0.72, 1.22, Math.random()),
    drift:
      CesiumMath.lerp(-1, 1, Math.random()) * (isSnow ? CesiumMath.lerp(42, 86, windFactor) : 18),
    alpha: isSnow
      ? CesiumMath.lerp(0.52, CesiumMath.lerp(0.94, 1, intensity), Math.random())
      : CesiumMath.lerp(0.24, 0.62, Math.random()),
    phase: Math.random() * Math.PI * 2,
  }
}

function resizePrecipitationCanvas() {
  const canvas = precipitationCanvas.value
  if (!canvas) return { width: 0, height: 0, pixelRatio: 1 }

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

function syncScreenWeatherParticles(width: number, height: number) {
  const targetCount = getScreenWeatherTargetCount()

  while (screenWeatherParticles.length < targetCount) {
    screenWeatherParticles.push(createScreenWeatherParticle(width, height, true))
  }

  if (screenWeatherParticles.length > targetCount) {
    screenWeatherParticles.length = targetCount
  }
}

function getWindScreenVector(): WindScreenVector {
  const windFromRadians = CesiumMath.toRadians(props.windDirectionDegrees)
  const windToRadians = windFromRadians + Math.PI

  return {
    x: Math.sin(windToRadians),
    y: -Math.cos(windToRadians),
  }
}

function drawRainParticle(
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
    particle.x - windVector.x * windOffset * 0.26,
    particle.y - particle.size - windVector.y * windOffset * 0.08,
  )
  context.stroke()
}

function drawSnowParticle(
  context: CanvasRenderingContext2D,
  particle: ScreenWeatherParticle,
  windVector: WindScreenVector,
  windOffset: number,
) {
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

  if (windOffset > 42) {
    context.globalAlpha = particle.alpha * clamp01(windOffset / 150) * 0.5
    context.strokeStyle = 'rgba(241, 245, 249, 0.7)'
    context.lineWidth = Math.max(0.8, radius * 0.36)
    context.beginPath()
    context.moveTo(particle.x, particle.y)
    context.lineTo(
      particle.x - windVector.x * windOffset * 0.18,
      particle.y - windVector.y * windOffset * 0.08,
    )
    context.stroke()
  }
}

function renderScreenWeatherFrame(timestamp: number) {
  const canvas = precipitationCanvas.value
  if (!canvas) return

  const context = canvas.getContext('2d')
  if (!context) return

  const { width, height, pixelRatio } = resizePrecipitationCanvas()
  const mode = getPrecipitationMode()
  const dt = lastScreenWeatherFrame
    ? Math.min(0.04, (timestamp - lastScreenWeatherFrame) / 1000)
    : 0.016
  lastScreenWeatherFrame = timestamp

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.clearRect(0, 0, width, height)

  if (mode) {
    const intensity = clamp01(props.precipitation / 12)
    const windOffset = clamp(props.windSpeed, 0, 28) * (mode === 'snow' ? 14 : 18)
    const windVector = getWindScreenVector()
    syncScreenWeatherParticles(width, height)
    context.lineCap = 'round'

    for (const particle of screenWeatherParticles) {
      if (mode === 'snow') {
        particle.phase += dt * CesiumMath.lerp(2.8, 5.6, clamp01(props.windSpeed / 14))
        particle.x +=
          (windVector.x * windOffset * 0.28 + Math.sin(particle.phase) * particle.drift) * dt
        particle.y += (particle.speed + windVector.y * windOffset * 0.16) * dt
        drawSnowParticle(context, particle, windVector, windOffset)
      } else {
        particle.x += windVector.x * windOffset * dt
        particle.y += (particle.speed + windVector.y * windOffset * 0.12) * dt
        drawRainParticle(context, particle, windVector, windOffset)
      }

      if (particle.y > height + 40 || particle.x < -80 || particle.x > width + 80) {
        Object.assign(particle, createScreenWeatherParticle(width, height, true))
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
    screenWeatherParticles = []
  }

  screenWeatherAnimationFrame = window.requestAnimationFrame(renderScreenWeatherFrame)
}

function startScreenWeather() {
  if (screenWeatherAnimationFrame) return

  lastScreenWeatherFrame = 0
  screenWeatherAnimationFrame = window.requestAnimationFrame(renderScreenWeatherFrame)
}

function stopScreenWeather() {
  if (screenWeatherAnimationFrame) {
    window.cancelAnimationFrame(screenWeatherAnimationFrame)
  }

  screenWeatherAnimationFrame = 0
  lastScreenWeatherFrame = 0
  screenWeatherParticles = []
}

function getWeatherTint() {
  const sky = getSkyPhase(props.time)
  const dawnWarmth = sky.dawn + sky.dusk
  const dustFactor = clamp01((props.aqi - 55) / 210)
  const clearRed = CesiumMath.lerp(0.58, 0.9, dawnWarmth)
  const clearGreen = CesiumMath.lerp(0.66, 0.82, sky.daylight)
  const clearBlue = CesiumMath.lerp(0.76, 0.92, sky.daylight)
  const red = CesiumMath.lerp(clearRed, 0.78, dustFactor)
  const green = CesiumMath.lerp(clearGreen, 0.58, dustFactor)
  const blue = CesiumMath.lerp(clearBlue, 0.34, dustFactor)

  return new Color(red, green, blue, 1)
}

function getCloudPosition(index: number) {
  const angle = index * 2.399963229728653
  const radius = Math.sqrt((index + 0.5) / CLOUD_LOD.maxClouds)
  const longitude = SEOUL_JAMSIL_VIEW.longitude + Math.cos(angle) * radius * CLOUD_LOD.longitudeSpan
  const latitude = SEOUL_JAMSIL_VIEW.latitude + Math.sin(angle) * radius * CLOUD_LOD.latitudeSpan
  const altitude = CLOUD_LOD.altitude + ((index * 179) % 620)

  return Cartesian3.fromDegrees(longitude, latitude, altitude)
}

function ensureCloudCollection() {
  if (!viewer || cloudCollection) return

  // CloudCollection은 Cesium의 절차적 노이즈 텍스처로 3D Cumulus Cloud를 그리는 전용 primitive입니다.
  // 스카이박스 오버레이보다 카메라 이동 시 입체감과 시차가 유지되므로 GIS 뷰포트의 실제 대기 레이어로 사용합니다.
  const clouds = viewer.scene.primitives.add(
    new CloudCollection({
      show: true,
      noiseDetail: 16,
    }),
  ) as CloudCollection
  clouds.noiseOffset = new Cartesian3(0.4, 0.2, 0.6)
  cloudCollection = clouds

  for (let index = 0; index < CLOUD_LOD.maxClouds; index += 1) {
    const width = 520 + ((index * 97) % 520)
    const height = 260 + ((index * 53) % 280)
    const depth = 220 + ((index * 41) % 220)

    clouds.add({
      position: getCloudPosition(index),
      // scale은 billboard의 물리 크기이고 maximumSize는 내부 구름 볼륨 샘플링 범위입니다.
      // 둘을 함께 키워 운량이 높아질수록 더 넓고 두꺼운 적운 군집처럼 보이게 합니다.
      scale: new Cartesian2(width, height),
      maximumSize: new Cartesian3(width * 0.92, height * 0.78, depth),
      slice: 0.44 + ((index * 17) % 18) / 100,
      brightness: 0.78,
      color: Color.WHITE.withAlpha(0.72),
    })
  }
}

function disposeCloudCollection() {
  if (!viewer || !cloudCollection) {
    cloudCollection = null
    return
  }

  // PrimitiveCollection.remove는 기본 설정에서 WebGL 리소스까지 destroy하므로 clear 상태 전환 시 누수가 남지 않습니다.
  viewer.scene.primitives.remove(cloudCollection)
  cloudCollection = null
}

function updateClouds() {
  if (!viewer) return

  const cover = clamp(props.cloudCover, 0, 100)
  if (cover < CLOUD_LOD.minimumCover) {
    disposeCloudCollection()
    viewer.scene.requestRender()
    return
  }

  ensureCloudCollection()
  if (!cloudCollection) return

  const sky = getSkyPhase(props.time)
  const desiredClouds = Math.round(CesiumMath.lerp(4, CLOUD_LOD.maxClouds, cover / 100))
  const brightness =
    CesiumMath.lerp(0.38, 0.92, sky.daylight) - clamp01(props.precipitation / 14) * 0.16
  const alpha = CesiumMath.lerp(0.36, 0.86, cover / 100)
  const tint = getWeatherTint()

  cloudCollection.show = desiredClouds > 0
  cloudCollection.noiseOffset = new Cartesian3(cover * 0.012, props.time * 0.018, props.aqi * 0.002)

  for (let index = 0; index < cloudCollection.length; index += 1) {
    const cloud: CumulusCloud = cloudCollection.get(index)
    const lodDistance = viewer.camera.positionCartographic.height > 5500 && index % 2 === 1
    cloud.show = index < desiredClouds && !lodDistance
    cloud.brightness = clamp(brightness, 0.26, 0.95)
    cloud.color = new Color(tint.red, tint.green, tint.blue, alpha)
    cloud.slice = 0.38 + ((index * 19) % 24) / 100
  }

  viewer.scene.requestRender()
}

function ensureWeatherPostProcessStage() {
  if (!viewer || weatherPostProcessStage) return

  // PostProcessStage는 비가 올 때의 노출, 채도, 차가운 색감을 최종 화면에 한 번에 적용합니다.
  // uniform 함수는 props 변경을 즉시 반영하므로 stage를 반복 생성하지 않아도 됩니다.
  weatherPostProcessStage = viewer.scene.postProcessStages.add(
    new PostProcessStage({
      name: WEATHER_POST_PROCESS_STAGE_NAME,
      sampleMode: PostProcessStageSampleMode.LINEAR,
      fragmentShader: `
        uniform sampler2D colorTexture;
        in vec2 v_textureCoordinates;
        uniform float u_intensity;
        uniform float u_night;
        uniform float u_haze;

        void main(void) {
          vec4 color = texture(colorTexture, v_textureCoordinates);
          float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          vec3 desaturated = mix(color.rgb, vec3(luminance), 0.22 * u_intensity + 0.12 * u_haze);
          vec3 rainCool = vec3(desaturated.r * 0.92, desaturated.g * 0.98, desaturated.b * 1.08);
          vec3 dustWarm = mix(rainCool, vec3(0.78, 0.61, 0.34), 0.38 * u_haze);
          float exposure = 1.0 - (0.18 * u_intensity + 0.08 * u_night + 0.07 * u_haze);
          out_FragColor = vec4(dustWarm * exposure, color.a);
        }
      `,
      uniforms: {
        u_intensity: () => clamp01(props.precipitation / 12),
        u_night: () => 1 - getSkyPhase(props.time).daylight,
        u_haze: () => clamp01((10 - props.visibility) / 10 + props.aqi / 240),
      },
    }),
  ) as PostProcessStage
}

function disposeWeatherPostProcessStage() {
  if (!viewer || !weatherPostProcessStage) {
    weatherPostProcessStage = null
    return
  }

  viewer.scene.postProcessStages.remove(weatherPostProcessStage)
  weatherPostProcessStage = null
}

function updatePrecipitation() {
  if (!viewer) return

  const mode = getPrecipitationMode()
  if (!mode) {
    disposeWeatherPostProcessStage()
    viewer.scene.requestRender()
    return
  }

  ensureWeatherPostProcessStage()

  if (weatherPostProcessStage) {
    weatherPostProcessStage.enabled = true
  }

  viewer.scene.requestRender()
}

function updateSunGlowPosition() {
  if (!viewer || viewer.isDestroyed()) {
    sunGlowStyle.value = { opacity: 0 }
    return
  }

  const sky = getSkyPhase(props.time)
  const sunPosition = getSunPositionForTime(viewer.clock.currentTime, sunPositionScratch)
  const toSun = Cartesian3.subtract(sunPosition, viewer.camera.positionWC, sunToCameraScratch)
  const isInFrontOfCamera = Cartesian3.dot(toSun, viewer.camera.directionWC) > 0
  const windowPosition = isInFrontOfCamera
    ? SceneTransforms.worldToWindowCoordinates(viewer.scene, sunPosition, sunWindowScratch)
    : undefined

  if (!windowPosition) {
    sunGlowStyle.value = { opacity: 0 }
    return
  }

  const horizonBoost = CesiumMath.lerp(0.64, 1.0, sky.horizonGlow)
  sunGlowStyle.value = {
    left: `${windowPosition.x}px`,
    top: `${windowPosition.y}px`,
    opacity: sky.daylight * horizonBoost,
    transform: 'translate(-50%, -50%)',
  }
}

function initializeViewer() {
  if (!cesiumContainer.value) return

  if (hasCesiumIonAccessToken) {
    Ion.defaultAccessToken = cesiumIonAccessToken
  }

  viewer = new Viewer(cesiumContainer.value, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    baseLayer: false,
    shouldAnimate: false,
  })

  viewer.scene.backgroundColor = Color.fromCssColorString('#020617')
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.show = true
    viewer.scene.skyAtmosphere.perFragmentAtmosphere = true
  }
  if (viewer.scene.sun) {
    viewer.scene.sun.show = true
    viewer.scene.sun.glowFactor = 1.8
  }
  if (viewer.scene.moon) {
    viewer.scene.moon.show = true
  }
  viewer.scene.sunBloom = true
  viewer.scene.light = new SunLight({ intensity: 2.0 })
  viewer.scene.atmosphere.dynamicLighting = DynamicAtmosphereLightingType.SUNLIGHT
  viewer.scene.fog.enabled = true
  viewer.scene.globe.show = false
  configureCameraControls()

  setInitialJamsilView()
  removeSunGlowUpdater = viewer.scene.postRender.addEventListener(updateSunGlowPosition)
  applySceneTime()
  applyAtmosphereToScene()
  updateClouds()
  updatePrecipitation()

  if (hasCesiumIonAccessToken) {
    void loadGooglePhotorealisticTiles()
  } else {
    statusMessage.value = 'Cesium ion token required for Google 3D Tiles'
  }
}

function configureCameraControls() {
  if (!viewer) return

  const controller = viewer.scene.screenSpaceCameraController
  controller.enableInputs = true
  controller.enableRotate = true
  controller.enableTranslate = true
  controller.enableZoom = true
  controller.enableTilt = true
  controller.enableLook = true
  controller.enableCollisionDetection = false
  controller.minimumZoomDistance = 80
  controller.maximumZoomDistance = 30000
  controller.maximumTiltAngle = undefined
  controller.inertiaSpin = 0.45
  controller.inertiaTranslate = 0.45
  controller.inertiaZoom = 0.35
  controller.zoomEventTypes = [CameraEventType.WHEEL, CameraEventType.PINCH]
  controller.lookEventTypes = [
    CameraEventType.RIGHT_DRAG,
    {
      eventType: CameraEventType.LEFT_DRAG,
      modifier: KeyboardEventModifier.SHIFT,
    },
  ]
}

function setInitialJamsilView() {
  if (!viewer) return

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(
      SEOUL_JAMSIL_VIEW.longitude,
      SEOUL_JAMSIL_VIEW.latitude,
      SEOUL_JAMSIL_VIEW.height,
    ),
    orientation: {
      heading: CesiumMath.toRadians(SEOUL_JAMSIL_VIEW.headingDegrees),
      pitch: CesiumMath.toRadians(SEOUL_JAMSIL_VIEW.pitchDegrees),
      roll: 0,
    },
  })
}

async function loadGooglePhotorealisticTiles() {
  if (!viewer) return

  isTilesLoading.value = true
  statusMessage.value = 'Loading Google Photorealistic 3D Tiles'

  try {
    const tileset = await Cesium3DTileset.fromIonAssetId(GOOGLE_3D_TILES_ION_ASSET_ID, {
      maximumScreenSpaceError: 2,
      cullWithChildrenBounds: true,
    })

    if (!viewer || destroyed) return

    viewer.scene.primitives.add(tileset)
    statusMessage.value = ''
  } catch (error) {
    console.error(error)
    statusMessage.value = 'Unable to load Google 3D Tiles asset'
  } finally {
    isTilesLoading.value = false
  }
}

function applyAtmosphereToScene() {
  if (!viewer) return

  const sky = getSkyPhase(props.time)
  const visibilityKm = clamp(props.visibility, 0.1, 30)
  const visibilityFactor = clamp01((20 - visibilityKm) / 20)
  const aqiHazeFactor = clamp01((props.aqi - 45) / 180)
  const precipitationHazeFactor = clamp01(props.precipitation / 16)
  const nightFactor = 1 - sky.daylight
  const extinctionCoefficient = 3.912 / (visibilityKm * 1000)
  const fogDensity = clamp(
    extinctionCoefficient * (1 + aqiHazeFactor * 2.2 + precipitationHazeFactor * 0.9),
    0.000045,
    0.0028,
  )
  const fogTint = getWeatherTint()
  viewer.scene.fog.enabled = visibilityKm < 22 || props.aqi > 65 || props.precipitation > 0.2
  viewer.scene.fog.renderable = true
  // Koschmieder 법칙의 소산 계수(3.912 / 가시거리)를 Cesium fog density에 매핑합니다.
  // 가시거리가 짧거나 AQI가 높을수록 지형과 3D Tiles가 기하급수적으로 부드럽게 묻히도록 합니다.
  viewer.scene.fog.density = fogDensity
  viewer.scene.fog.minimumBrightness = CesiumMath.lerp(0.018, 0.16, sky.daylight)
  viewer.scene.backgroundColor = Color.lerp(
    Color.fromCssColorString(sky.daylight > 0.1 ? '#0f2747' : '#020617'),
    fogTint,
    CesiumMath.lerp(0.08, 0.24, Math.max(visibilityFactor, aqiHazeFactor)),
    new Color(),
  )
  viewer.scene.fog.screenSpaceErrorFactor = CesiumMath.lerp(1.4, 3.2, visibilityFactor)
  viewer.scene.fog.visualDensityScalar = CesiumMath.lerp(
    0.16,
    0.68,
    Math.max(visibilityFactor, aqiHazeFactor),
  )
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.atmosphereLightIntensity = CesiumMath.lerp(3.0, 12.0, sky.daylight)
    // Cesium Fog에는 color 프로퍼티가 없어, 시간대별 haze 색은 skyAtmosphere와 backgroundColor에 블렌딩합니다.
    viewer.scene.skyAtmosphere.hueShift =
      CesiumMath.lerp(-0.08, 0.02, sky.daylight) + aqiHazeFactor * 0.06
    viewer.scene.skyAtmosphere.saturationShift =
      CesiumMath.lerp(-0.18, 0.08, sky.daylight) - visibilityFactor * 0.14 + aqiHazeFactor * 0.08
    viewer.scene.skyAtmosphere.brightnessShift =
      CesiumMath.lerp(-0.55, 0.12, sky.daylight) - precipitationHazeFactor * 0.1
  }
  if (viewer.scene.light instanceof SunLight) {
    viewer.scene.light.intensity = CesiumMath.lerp(0.05, 2.0, sky.daylight)
  }
  if (viewer.scene.sun) {
    viewer.scene.sun.glowFactor = CesiumMath.lerp(1.1, 3.1, sky.horizonGlow)
  }
  if (viewer.scene.moon) {
    viewer.scene.moon.show = nightFactor > 0.25
  }
  viewer.scene.requestRender()
}

function applySceneTime() {
  if (!viewer) return

  const currentTime = JulianDate.fromDate(getSceneDateFromLocalTime(props.time))
  const startTime = JulianDate.fromDate(getSceneDateFromLocalTime(0))
  const stopTime = JulianDate.fromDate(getSceneDateFromLocalTime(24))

  viewer.clock.startTime = startTime
  viewer.clock.stopTime = stopTime
  viewer.clock.currentTime = currentTime
  viewer.clock.clockRange = ClockRange.LOOP_STOP
  viewer.clock.shouldAnimate = false
  viewer.clock.multiplier = 1
  updateSunGlowPosition()
  viewer.scene.requestRender()
}

function lerpRadians(start: number, end: number, progress: number) {
  const tau = Math.PI * 2
  const delta = ((((end - start + Math.PI) % tau) + tau) % tau) - Math.PI
  return start + delta * progress
}

function flyToLocation(target: CameraWaypoint) {
  if (!viewer) return

  activeCameraTween?.kill()

  const camera = viewer.camera
  const startPosition = Cartesian3.clone(camera.positionWC)
  const endPosition = Cartesian3.fromDegrees(
    target.longitude,
    target.latitude,
    target.height ?? SEOUL_JAMSIL_VIEW.height,
  )
  const startHeading = camera.heading
  const startPitch = camera.pitch
  const startRoll = camera.roll
  const endHeading = CesiumMath.toRadians(target.headingDegrees ?? SEOUL_JAMSIL_VIEW.headingDegrees)
  const endPitch = CesiumMath.toRadians(target.pitchDegrees ?? SEOUL_JAMSIL_VIEW.pitchDegrees)
  const endRoll = CesiumMath.toRadians(target.rollDegrees ?? 0)
  const progress = { value: 0 }
  const currentPosition = new Cartesian3()

  activeCameraTween = gsap.to(progress, {
    value: 1,
    duration: target.duration ?? 3.2,
    ease: 'power3.inOut',
    onUpdate: () => {
      if (!viewer) return

      Cartesian3.lerp(startPosition, endPosition, progress.value, currentPosition)
      camera.setView({
        destination: currentPosition,
        orientation: {
          heading: lerpRadians(startHeading, endHeading, progress.value),
          pitch: CesiumMath.lerp(startPitch, endPitch, progress.value),
          roll: CesiumMath.lerp(startRoll, endRoll, progress.value),
        },
      })
    },
    onComplete: () => {
      activeCameraTween = null
    },
  })
}

watch(
  () => [
    props.time,
    props.cloudCover,
    props.precipitation,
    props.aqi,
    props.visibility,
    props.temperature,
    props.windSpeed,
    props.windDirectionDegrees,
    props.humidity,
  ],
  () => {
    applySceneTime()
    applyAtmosphereToScene()
    updateClouds()
    updatePrecipitation()
  },
)

onMounted(async () => {
  await nextTick()
  startScreenWeather()
  initializeViewer()
})

onBeforeUnmount(() => {
  destroyed = true
  activeCameraTween?.kill()
  activeCameraTween = null
  removeSunGlowUpdater?.()
  removeSunGlowUpdater = null
  disposeCloudCollection()
  disposeWeatherPostProcessStage()
  stopScreenWeather()

  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
  }

  viewer = null
})

defineExpose({
  flyToLocation,
})
</script>

<template>
  <section class="relative h-full w-full overflow-hidden bg-slate-950">
    <div
      id="cesiumContainer"
      ref="cesiumContainer"
      class="absolute inset-0 h-full w-full"
      @contextmenu.prevent
    ></div>
    <div class="pointer-events-none absolute inset-0 mix-blend-screen" :style="skyTimeStyle"></div>
    <div
      class="pointer-events-none absolute h-24 w-24 rounded-full bg-amber-100/80 mix-blend-screen shadow-[0_0_34px_rgba(253,224,71,0.88),0_0_110px_rgba(251,146,60,0.68),0_0_190px_rgba(180,83,9,0.32)]"
      :style="sunGlowStyle"
    ></div>
    <div class="pointer-events-none absolute inset-0" :style="atmosphereOverlayStyle"></div>
    <canvas
      ref="precipitationCanvas"
      class="pointer-events-none absolute inset-0 h-full w-full"
    ></canvas>
    <div
      v-if="statusMessage || isTilesLoading"
      class="pointer-events-none absolute bottom-5 left-5 rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm font-bold text-cyan-200 uppercase backdrop-blur-md"
    >
      {{ statusMessage }}
    </div>
  </section>
</template>

<style scoped>
#cesiumContainer :deep(.cesium-viewer),
#cesiumContainer :deep(.cesium-viewer-cesiumWidgetContainer),
#cesiumContainer :deep(.cesium-widget),
#cesiumContainer :deep(canvas) {
  width: 100%;
  height: 100%;
  background: #020617;
}

#cesiumContainer,
#cesiumContainer :deep(.cesium-viewer),
#cesiumContainer :deep(.cesium-widget) {
  background: #020617 !important;
}

#cesiumContainer :deep(.cesium-viewer-bottom) {
  bottom: 0.75rem;
  left: 1rem;
}
</style>
