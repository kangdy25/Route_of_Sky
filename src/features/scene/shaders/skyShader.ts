/** 하늘 돔에서 대기, 태양, 별, 절차적 구름을 그리는 shader source입니다. */
export const skyVertexShader = `
varying vec3 vSkyDirection;

void main() {
    vSkyDirection = normalize(position);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

export const skyFragmentShader = `
uniform vec3 uSunPosition;
uniform float uTime;
uniform float uCloudCover;
uniform float uPrecipitation;

varying vec3 vSkyDirection;

// value noise에 사용할 간단한 의사 난수 hash입니다.
float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2D value noise입니다.
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

// 자연스러운 절차적 구름을 만들기 위한 2D fBm입니다.
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

// 밤하늘의 반짝이는 별을 생성합니다.
float stars(vec3 p) {
    // 하늘 방향을 격자 셀로 나누기 위해 좌표를 스케일링합니다.
    vec3 q = p * 180.0;
    vec3 ip = floor(q);
    vec3 fp = fract(q);
    
    // 격자 셀 좌표를 hash 값으로 변환합니다.
    float h = hash(ip.xy + ip.z * 17.3);
    
    if (h > 0.988) { // 약 1.2%의 셀에만 별을 그립니다.
        vec3 offset = vec3(hash(ip.yz), hash(ip.zx), h) * 0.5;
        float dist = length(fp - 0.5 - offset);
        
        // 무작위 offset을 섞은 sine wave로 별 반짝임을 만듭니다.
        float twinkle = sin(uTime * 2.5 + h * 6.28) * 0.35 + 0.65;
        return smoothstep(0.06, 0.0, dist) * h * twinkle;
    }
    return 0.0;
}

void main() {
    vec3 viewDir = normalize(vSkyDirection);
    vec3 sunDir = normalize(uSunPosition);
    
    float sunAltitude = sunDir.y;
    
    // 1. 시간대별 혼합 계수입니다.
    // 낮: 태양이 지평선 위에 높게 있습니다.
    float dayFactor = smoothstep(-0.15, 0.35, sunAltitude);
    // 밤: 태양이 지평선 아래 깊게 있습니다.
    float nightFactor = smoothstep(0.15, -0.35, sunAltitude);
    // 일출/일몰: 낮과 밤 사이의 전환 구간입니다.
    float sunsetFactor = 1.0 - dayFactor - nightFactor;
    
    // 2. 기본 하늘 그라데이션입니다. 천정과 지평선 색을 따로 둡니다.
    // 낮 색상입니다.
    vec3 zenithDay = vec3(0.12, 0.35, 0.72);
    vec3 horizonDay = vec3(0.55, 0.75, 0.95);
    
    // 일출/일몰 색상입니다.
    vec3 zenithSunset = vec3(0.08, 0.08, 0.22);
    vec3 horizonSunset = vec3(0.95, 0.38, 0.15);
    
    // 밤 색상입니다.
    vec3 zenithNight = vec3(0.015, 0.018, 0.045);
    vec3 horizonNight = vec3(0.035, 0.045, 0.095);
    
    // 현재 시간대 계수에 따라 천정색과 지평선색을 섞습니다.
    vec3 zenithColor = zenithDay * dayFactor + zenithSunset * sunsetFactor + zenithNight * nightFactor;
    vec3 horizonColor = horizonDay * dayFactor + horizonSunset * sunsetFactor + horizonNight * nightFactor;
    
    // 시선 방향의 높이 각도에 따라 수직 하늘 그라데이션을 보간합니다.
    float h = max(0.0, viewDir.y);
    vec3 skyBase = mix(horizonColor, zenithColor, pow(h, 0.75));
    
    // 3. 태양 렌더링입니다.
    float cosTheta = dot(viewDir, sunDir);
    float sunVisibility = smoothstep(-0.12, 0.12, sunAltitude);
    
    // 선명한 태양 원반입니다.
    float sunAngle = 0.993; // 대략 0.5도에 해당합니다.
    float sunDisk = smoothstep(sunAngle, sunAngle + 0.002, cosTheta) * sunVisibility;
    vec3 sunColor = mix(vec3(1.0, 0.55, 0.15), vec3(1.0, 1.0, 0.95), dayFactor);
    
    // 부드러운 태양 glow입니다.
    float sunGlowPower = mix(25.0, 45.0, dayFactor);
    float sunGlow = pow(max(0.0, cosTheta), sunGlowPower) * 0.45 * sunVisibility;
    vec3 glowColor = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.9, 0.75), dayFactor);
    
    // 기본 하늘, 태양 원반, glow를 합치고 강수량이 높을수록 어둡게 만듭니다.
    float sunObscure = 1.0 - uPrecipitation * 0.82;
    vec3 skyWithSun = skyBase + 
                     (sunDisk * sunColor * 1.5 * sunObscure) + 
                     (sunGlow * glowColor * sunObscure);
                    
    // 4. 밤하늘 별 필드입니다.
    // 별은 밤에만 보이고 구름과 비가 많을수록 가려집니다.
    float starDensity = stars(viewDir) * nightFactor * (1.0 - uCloudCover) * (1.0 - uPrecipitation);
    skyWithSun += vec3(starDensity * 0.8);
    
    // 5. 원근감 있는 투영 평면 위에 절차적 구름 레이어를 그립니다.
    vec3 finalColor = skyWithSun;
    
    if (viewDir.y > 0.0) {
        // 3D 방향 벡터를 수평 하늘 평면에 투영해 원근감을 만듭니다.
        vec2 cloudUV = viewDir.xz / (viewDir.y + 0.16);
        
        // 바람 방향처럼 보이는 애니메이션 offset입니다.
        vec2 windOffset = vec2(0.015, 0.01) * uTime;
        vec2 p = cloudUV * 1.2 - windOffset;
        
        // fBm noise로 구름 형태를 만듭니다.
        float n1 = fbm(p);
        float n2 = fbm(p * 2.3 + vec2(10.0));
        float cloudNoise = mix(n1, n2, 0.35);
        
        // cloudCover 값에 맞춰 구름 밀도 threshold와 mask를 계산합니다.
        float cloudThreshold = 1.0 - uCloudCover;
        float cloudDensity = smoothstep(cloudThreshold - 0.16, cloudThreshold + 0.16, cloudNoise);
        
        // 낮, 일몰, 밤 시간대에 맞춰 구름 색을 계산합니다.
        vec3 cloudBaseDay = vec3(0.95, 0.95, 0.98);
        vec3 cloudBaseSunset = mix(vec3(0.95, 0.58, 0.32), vec3(0.35, 0.22, 0.32), h);
        vec3 cloudBaseNight = vec3(0.06, 0.07, 0.14);
        
        vec3 cloudBaseColor = cloudBaseDay * dayFactor + 
                             cloudBaseSunset * sunsetFactor + 
                             cloudBaseNight * nightFactor;
                             
        // 강수량이 높으면 구름을 어두운 폭풍색으로 이동시킵니다.
        vec3 stormCloudColor = vec3(0.18, 0.20, 0.24);
        cloudBaseColor = mix(cloudBaseColor, stormCloudColor, uPrecipitation);
        
        // 태양 방향을 이용해 구름의 간단한 명암과 하이라이트를 계산합니다.
        // 그림자 계산을 위해 UV를 태양 방향으로 살짝 이동합니다.
        vec2 sunDirXZ = normalize(sunDir.xz + vec2(0.001)); // 0으로 나누는 상황을 피합니다.
        float shadowNoise = fbm(p + sunDirXZ * 0.05);
        float shadow = smoothstep(-0.02, 0.18, cloudNoise - shadowNoise);
        
        // 구름의 그늘진 아래쪽 영역을 더 어둡게 만듭니다.
        vec3 shadedCloudColor = mix(cloudBaseColor * 0.65, cloudBaseColor, 0.35 + 0.65 * shadow);
        
        // 지평선 근처에서 구름을 부드럽게 사라지게 해 경계선을 줄입니다.
        float horizonFade = smoothstep(0.0, 0.22, viewDir.y);
        float finalCloudAlpha = cloudDensity * 0.88 * horizonFade;
        
        finalColor = mix(finalColor, shadedCloudColor, finalCloudAlpha);
    }
    
    // 6. 강수량에 따른 폭풍 어둡기 보정입니다.
    // 강수량이 높을수록 전체 대기를 어두운 회색으로 섞습니다.
    vec3 stormSkyColor = vec3(0.14, 0.16, 0.20);
    finalColor = mix(finalColor, stormSkyColor, uPrecipitation * 0.68);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`
