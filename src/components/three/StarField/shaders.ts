export const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uBoot;

  // SoA attributes for SIMD
  attribute float positionX;
  attribute float positionY;
  attribute float positionZ;
  attribute float colorR;
  attribute float colorG;
  attribute float colorB;
  attribute float size;

  varying vec3 vColor;
  varying float vSize;
  varying float vTwinkle;
  varying float vSparkle;
  varying float vBoot;

  void main() {
    // Reconstruct from SoA
    vec3 starPosition = vec3(positionX, positionY, positionZ);
    vColor = vec3(colorR, colorG, colorB);
    vSize = size;
    vBoot = uBoot;

    // Radial-expand boot: collapse toward origin (floored at 0.2 to avoid the
    // origin singularity where gl_PointSize = 300 / -z explodes) then expand out.
    vec3 position = mix(starPosition * 0.2, starPosition, uBoot);

    // Twinkle + sparkle are pure functions of time and final position — computed
    // here instead of being uploaded as per-frame attributes from WASM.
    float twinkleBase = sin(uTime * 3.0 + positionX * 10.0 + positionY * 10.0) * 0.3 + 0.7;
    float sparklePhase = sin(uTime * 15.0 + positionX * 20.0 + positionY * 30.0);
    float sparkle = sparklePhase > 0.98 ? (sparklePhase - 0.98) / 0.02 : 0.0;
    vTwinkle = twinkleBase + sparkle;
    vSparkle = sparkle;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Clamp so collapsed/near stars can't blow up into full-screen additive overdraw.
    gl_PointSize = min(size * (300.0 / -mvPosition.z), 64.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vSize;
  varying float vTwinkle;
  varying float vSparkle;
  varying float vBoot;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);

    // Soft circular shape
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

    // Glow effect
    float glow = exp(-dist * 2.0) * 0.8 * (vSize / 10.0);

    // Spike effect when sparkling
    float spike = 0.0;
    if (vSparkle > 0.1) {
      // Use step functions
      vec2 coord = gl_PointCoord - 0.5;
      float cross = step(0.95, abs(coord.x)) + step(0.95, abs(coord.y));
      spike = cross * vSparkle * (1.0 - dist * 2.0);
    }

    vec3 finalColor = min(vColor + glow, vec3(1.0));
    // vBoot fades stars in as they expand outward during the boot animation.
    float finalAlpha = (alpha + spike * 0.5) * vBoot;

    gl_FragColor = vec4(finalColor * vTwinkle, finalAlpha);
  }
`
