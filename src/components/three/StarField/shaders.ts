export const VERTEX_SHADER = `
  // SoA attributes for SIMD
  attribute float positionX;
  attribute float positionY;
  attribute float positionZ;
  attribute float colorR;
  attribute float colorG;
  attribute float colorB;
  attribute float size;
  attribute float twinkle;
  attribute float sparkle;

  varying vec3 vColor;
  varying float vSize;
  varying float vTwinkle;
  varying float vSparkle;

  void main() {
    // Reconstruct from SoA
    vec3 position = vec3(positionX, positionY, positionZ);
    vec3 customColor = vec3(colorR, colorG, colorB);

    vColor = customColor;
    vSize = size;
    vTwinkle = twinkle;
    vSparkle = sparkle;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vSize;
  varying float vTwinkle;
  varying float vSparkle;

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
    float finalAlpha = alpha + spike * 0.5;

    gl_FragColor = vec4(finalColor * vTwinkle, finalAlpha);
  }
`
