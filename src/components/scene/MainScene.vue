<script setup lang="ts">
import { computed, watch } from 'vue'
import { Vector3, Color, BackSide, Clock } from 'three'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import SkyElements from './SkyElements.vue'

// Props mapping standard weather parameters from the UI
const props = withDefaults(
  defineProps<{
    time?: number // Time of day (0.0 to 24.0 hours)
    cloudCover?: number // Cloud cover density (0 to 100 percentage)
    precipitation?: number // Precipitation intensity (0 to 100 percentage)
    aqi?: number // Air Quality Index (0 to 500)
    visibility?: number // Visibility distance (0.0 to 20.0 km)
  }>(),
  {
    time: 16.5, // 16:30 (4:30 PM) by default
    cloudCover: 65,
    precipitation: 0.0,
    aqi: 45,
    visibility: 15.0,
  },
)

// 1. Sun Position Calculations
const azimuth = Math.PI / 4 // 45 degree angle slant for natural sunlight shadows
const theta = computed(() => {
  // Map hours (0-24) to a circular orbit (0 to 2*PI radians)
  // Sunrise at 6.0 (theta = 0), Noon at 12.0 (theta = PI/2), Sunset at 18.0 (theta = PI)
  return ((props.time - 6.0) / 24.0) * Math.PI * 2
})

const sunPosition = computed(() => {
  const t = theta.value
  const x = Math.cos(t) * Math.cos(azimuth)
  const y = Math.sin(t) // Altitude (-1 to 1)
  const z = Math.cos(t) * Math.sin(azimuth)
  return new Vector3(x, y, z).normalize()
})

// Helper array representation for TresJS light bindings
const sunDirectionArray = computed<[number, number, number]>(() => {
  // If night, position the light source as the moon (opposite direction of the sun)
  if (sunPosition.value.y < 0) {
    const moonPos = sunPosition.value.clone().multiplyScalar(-5)
    return [moonPos.x, moonPos.y, moonPos.z]
  }
  return [sunPosition.value.x * 5, sunPosition.value.y * 5, sunPosition.value.z * 5]
})

// 2. Dynamic Lighting Calculations
const ambientColor = computed(() => {
  const sunAlt = sunPosition.value.y
  const dayFactor = Math.max(0, Math.min(1, (sunAlt + 0.1) / 0.3))
  const nightFactor = Math.max(0, Math.min(1, (-sunAlt + 0.1) / 0.3))
  const sunsetFactor = 1.0 - dayFactor - nightFactor

  // Light colors: daylight (blue-sky), sunset (warm orange), night (cool navy)
  const r = 0.5 * dayFactor + 0.75 * sunsetFactor + 0.05 * nightFactor
  const g = 0.6 * dayFactor + 0.45 * sunsetFactor + 0.08 * nightFactor
  const b = 0.75 * dayFactor + 0.3 * sunsetFactor + 0.15 * nightFactor

  // Heavy precipitation turns ambient light slate gray
  const precFactor = props.precipitation / 100
  const stormR = 0.22,
    stormG = 0.24,
    stormB = 0.28

  return new Color(
    r * (1 - precFactor) + stormR * precFactor,
    g * (1 - precFactor) + stormG * precFactor,
    b * (1 - precFactor) + stormB * precFactor,
  )
})

const ambientIntensity = computed(() => {
  const sunAlt = sunPosition.value.y
  const dayFactor = Math.max(0, Math.min(1, (sunAlt + 0.1) / 0.3))
  const nightFactor = Math.max(0, Math.min(1, (-sunAlt + 0.1) / 0.3))
  const sunsetFactor = 1.0 - dayFactor - nightFactor

  let baseIntensity = 0.65 * dayFactor + 0.45 * sunsetFactor + 0.18 * nightFactor

  // Dim ambient light slightly during heavy precipitation
  const precFactor = props.precipitation / 100
  baseIntensity *= 1.0 - precFactor * 0.35

  return baseIntensity
})

const directionalColor = computed(() => {
  const sunAlt = sunPosition.value.y
  const dayFactor = Math.max(0, Math.min(1, (sunAlt + 0.1) / 0.3))
  const nightFactor = Math.max(0, Math.min(1, (-sunAlt + 0.1) / 0.3))
  const sunsetFactor = 1.0 - dayFactor - nightFactor

  // Daylight (bright sun), sunset (fiery red-orange), night (cool pale moonlight)
  const r = 1.0 * dayFactor + 1.0 * sunsetFactor + 0.65 * nightFactor
  const g = 0.95 * dayFactor + 0.55 * sunsetFactor + 0.72 * nightFactor
  const b = 0.85 * dayFactor + 0.25 * sunsetFactor + 0.85 * nightFactor

  return new Color(r, g, b)
})

const directionalIntensity = computed(() => {
  const sunAlt = sunPosition.value.y
  const dayFactor = Math.max(0, Math.min(1, (sunAlt + 0.1) / 0.3))
  const nightFactor = Math.max(0, Math.min(1, (-sunAlt + 0.1) / 0.3))
  const sunsetFactor = 1.0 - dayFactor - nightFactor

  // High directional sun light, medium warm sunset light, soft moonlight
  let baseIntensity = 1.3 * dayFactor + 0.85 * sunsetFactor + 0.18 * nightFactor

  // Heavy rain/storm clouds block direct directional sunlight/moonlight
  const precFactor = props.precipitation / 100
  baseIntensity *= 1.0 - precFactor * 0.88

  return baseIntensity
})

// 3. Dynamic Fog Calculations
const fogColor = computed(() => {
  const sunAlt = sunPosition.value.y
  const dayFactor = Math.max(0, Math.min(1, (sunAlt + 0.1) / 0.3))
  const nightFactor = Math.max(0, Math.min(1, (-sunAlt + 0.1) / 0.3))
  const sunsetFactor = 1.0 - dayFactor - nightFactor

  // Fog matches horizon color to blend scene objects into the distance
  const r = 140 * dayFactor + 224 * sunsetFactor + 10 * nightFactor
  const g = 185 * dayFactor + 115 * sunsetFactor + 13 * nightFactor
  const b = 235 * dayFactor + 65 * sunsetFactor + 28 * nightFactor

  // Dark grey-blue fog under storm precipitation
  const precFactor = props.precipitation / 100
  const stormFog = [74, 85, 104]

  const finalR = (r * (1 - precFactor) + stormFog[0] * precFactor) / 255
  const finalG = (g * (1 - precFactor) + stormFog[1] * precFactor) / 255
  const finalB = (b * (1 - precFactor) + stormFog[2] * precFactor) / 255

  return new Color(finalR, finalG, finalB)
})

const fogDensity = computed(() => {
  // Physical visibility mapping (Koschmieder's law: density = 3.912 / visibility_in_meters)
  // Clamp visibility to a minimum of 0.01 km to prevent division by zero
  const visInMeters = Math.max(0.01, props.visibility) * 1000
  const densityFromVis = 3.912 / visInMeters

  // Haze mapping from AQI: 0 to 500 maps to 0.0 to 0.07 extra fog density
  const aqiClamped = Math.max(0, props.aqi)
  const densityFromAqi = (aqiClamped / 500) * 0.07

  return densityFromVis + densityFromAqi
})

// 4. Custom Procedural Sky Dome Shader Material Uniforms
const uniforms = {
  uSunPosition: { value: new Vector3() },
  uTime: { value: 0 },
  uCloudCover: { value: 0.65 },
  uPrecipitation: { value: 0.0 },
}

// Reactively synchronize uniforms when props change
watch(
  () => sunPosition.value,
  (newVal) => {
    uniforms.uSunPosition.value.copy(newVal)
  },
  { immediate: true },
)

watch(
  () => props.cloudCover,
  (newVal) => {
    uniforms.uCloudCover.value = newVal / 100
  },
  { immediate: true },
)

watch(
  () => props.precipitation,
  (newVal) => {
    uniforms.uPrecipitation.value = newVal / 100
  },
  { immediate: true },
)

// Tick the time uniform for cloud wind animation & night star twinkling
const clock = new Clock()
const onBeforeRender = () => {
  uniforms.uTime.value = clock.getElapsedTime()
}

// Vertex Shader
const vertexShader = `
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
    vNormal = normal;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

// Fragment Shader (Procedural Atmosphere, Sun, Twinkling Stars, & fBm Clouds)
const fragmentShader = `
uniform vec3 uSunPosition;
uniform float uTime;
uniform float uCloudCover;
uniform float uPrecipitation;

varying vec3 vWorldPosition;
varying vec3 vNormal;

// Simple pseudo-random hash for value noise
float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2D Value Noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

// 2D Fractional Brownian Motion (5 octaves) for realistic procedural clouds
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; ++i) {
        v += a * noise(p);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

// Twinkling stars generator for night sky
float stars(vec3 p) {
    // scale coordinates to partition sky into cells
    vec3 q = p * 180.0;
    vec3 ip = floor(q);
    vec3 fp = fract(q);
    
    // Hash grid cell coordinates
    float h = hash(ip.xy + ip.z * 17.3);
    
    if (h > 0.988) { // Draw stars in ~1.2% of cells
        vec3 offset = vec3(hash(ip.yz), hash(ip.zx), h) * 0.5;
        float dist = length(fp - 0.5 - offset);
        
        // Star twinkle effect via sine wave with randomized offset
        float twinkle = sin(uTime * 2.5 + h * 6.28) * 0.35 + 0.65;
        return smoothstep(0.06, 0.0, dist) * h * twinkle;
    }
    return 0.0;
}

void main() {
    vec3 viewDir = normalize(vWorldPosition);
    vec3 sunDir = normalize(uSunPosition);
    
    float sunAltitude = sunDir.y;
    
    // 1. Time-of-day Weighting Factors
    // Day: sun is high above horizon
    float dayFactor = smoothstep(-0.05, 0.25, sunAltitude);
    // Night: sun is deep below horizon
    float nightFactor = smoothstep(0.05, -0.25, sunAltitude);
    // Sunset/Dawn: transitional zone
    float sunsetFactor = 1.0 - dayFactor - nightFactor;
    
    // 2. Base Sky Gradients (Zenith & Horizon)
    // Day Colors
    vec3 zenithDay = vec3(0.12, 0.35, 0.72);
    vec3 horizonDay = vec3(0.55, 0.75, 0.95);
    
    // Sunset/Dawn Colors
    vec3 zenithSunset = vec3(0.08, 0.08, 0.22);
    vec3 horizonSunset = vec3(0.95, 0.38, 0.15);
    
    // Night Colors
    vec3 zenithNight = vec3(0.015, 0.018, 0.045);
    vec3 horizonNight = vec3(0.035, 0.045, 0.095);
    
    // Blend Zenith and Horizon based on current time factors
    vec3 zenithColor = zenithDay * dayFactor + zenithSunset * sunsetFactor + zenithNight * nightFactor;
    vec3 horizonColor = horizonDay * dayFactor + horizonSunset * sunsetFactor + horizonNight * nightFactor;
    
    // Interpolate vertical sky color gradient based on height angle
    float h = max(0.0, viewDir.y);
    vec3 skyBase = mix(horizonColor, zenithColor, pow(h, 0.75));
    
    // 3. Sun Rendering
    float cosTheta = dot(viewDir, sunDir);
    float sunVisibility = smoothstep(-0.12, 0.12, sunAltitude);
    
    // Crisp sun disk
    float sunAngle = 0.993; // Approximately 0.5 degrees
    float sunDisk = smoothstep(sunAngle, sunAngle + 0.002, cosTheta) * sunVisibility;
    vec3 sunColor = mix(vec3(1.0, 0.55, 0.15), vec3(1.0, 1.0, 0.95), dayFactor);
    
    // Soft solar flare/glow
    float sunGlowPower = mix(25.0, 45.0, dayFactor);
    float sunGlow = pow(max(0.0, cosTheta), sunGlowPower) * 0.45 * sunVisibility;
    vec3 glowColor = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.9, 0.75), dayFactor);
    
    // Combine base sky, sun disk, and sun glow (dimmed by precipitation)
    float sunObscure = 1.0 - uPrecipitation * 0.82;
    vec3 skyWithSun = skyBase + 
                     (sunDisk * sunColor * 1.5 * sunObscure) + 
                     (sunGlow * glowColor * sunObscure);
                     
    // 4. Star Field (Night Sky)
    // Stars only appear at night and are masked by clouds and rain
    float starDensity = stars(viewDir) * nightFactor * (1.0 - uCloudCover) * (1.0 - uPrecipitation);
    skyWithSun += vec3(starDensity * 0.8);
    
    // 5. Procedural Cloud Layer (rendered on a projected plane for perspective)
    vec3 finalColor = skyWithSun;
    
    if (viewDir.y > 0.0) {
        // Perspective projection: map 3D direction vector onto flat horizontal sky plane
        vec2 cloudUV = viewDir.xz / (viewDir.y + 0.16);
        
        // Wind speed & animation offset
        vec2 windOffset = vec2(0.015, 0.01) * uTime;
        vec2 p = cloudUV * 1.2 - windOffset;
        
        // Generate fractional Brownian motion noise for cloud shapes
        float n1 = fbm(p);
        float n2 = fbm(p * 2.3 + vec2(10.0));
        float cloudNoise = mix(n1, n2, 0.35);
        
        // Threshold and mask cloud density based on the cloudCover slider (0.0 to 1.0)
        float cloudThreshold = 1.0 - uCloudCover;
        float cloudDensity = smoothstep(cloudThreshold - 0.16, cloudThreshold + 0.16, cloudNoise);
        
        // Calculate cloud coloring (bright white in day, shaded gold/pink at sunset, dark at night)
        vec3 cloudBaseDay = vec3(0.95, 0.95, 0.98);
        vec3 cloudBaseSunset = mix(vec3(0.95, 0.58, 0.32), vec3(0.35, 0.22, 0.32), h);
        vec3 cloudBaseNight = vec3(0.06, 0.07, 0.14);
        
        vec3 cloudBaseColor = cloudBaseDay * dayFactor + 
                             cloudBaseSunset * sunsetFactor + 
                             cloudBaseNight * nightFactor;
                             
        // Shift clouds to dark grey storm colors if precipitation is high
        vec3 stormCloudColor = vec3(0.18, 0.20, 0.24);
        cloudBaseColor = mix(cloudBaseColor, stormCloudColor, uPrecipitation);
        
        // Simple directional lighting on clouds (sunlight highlights)
        // Offset UV slightly in the direction of the sun to calculate shadow
        vec2 sunDirXZ = normalize(sunDir.xz + vec2(0.001)); // Avoid divide-by-zero
        float shadowNoise = fbm(p + sunDirXZ * 0.05);
        float shadow = smoothstep(-0.02, 0.18, cloudNoise - shadowNoise);
        
        // Darken the shaded/underside regions of the clouds
        vec3 shadedCloudColor = mix(cloudBaseColor * 0.65, cloudBaseColor, 0.35 + 0.65 * shadow);
        
        // Softly fade clouds out near the horizon to prevent harsh boundaries
        float horizonFade = smoothstep(0.0, 0.22, viewDir.y);
        float finalCloudAlpha = cloudDensity * 0.88 * horizonFade;
        
        finalColor = mix(finalColor, shadedCloudColor, finalCloudAlpha);
    }
    
    // 6. Precipitation Storm Darkening
    // When precipitation is high, blend the entire atmosphere towards a dark storm gray
    vec3 stormSkyColor = vec3(0.14, 0.16, 0.20);
    finalColor = mix(finalColor, stormSkyColor, uPrecipitation * 0.68);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`
</script>

<template>
  <!-- TresCanvas setup with background fog matches horizon color -->
  <TresCanvas clear-color="#000000" window-size>
    <TresPerspectiveCamera :position="[3, 3, 3]" :look-at="[0, 0, 0]" />
    <OrbitControls />

    <!-- Dynamic Environment Lights -->
    <TresAmbientLight :color="ambientColor" :intensity="ambientIntensity" />
    <TresDirectionalLight
      :position="sunDirectionArray"
      :color="directionalColor"
      :intensity="directionalIntensity"
      cast-shadow
    />

    <!-- Dynamic Fog System -->
    <TresFogExp2 :color="fogColor" :density="fogDensity" />

    <!-- Procedural Sky Dome Mesh -->
    <TresMesh @before-render="onBeforeRender">
      <TresSphereGeometry :args="[400, 64, 32]" />
      <TresShaderMaterial
        :vertex-shader="vertexShader"
        :fragment-shader="fragmentShader"
        :uniforms="uniforms"
        :side="BackSide"
        :depth-write="false"
        :fog="false"
      />
    </TresMesh>

    <!-- Base geometry placeholder (rotating box mesh) -->
    <SkyElements />
  </TresCanvas>
</template>
