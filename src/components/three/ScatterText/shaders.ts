// Vertex shader
export const vertexShader = `
  // SoA attributes for SIMD optimization
  attribute float positionX;
  attribute float positionY;
  attribute float colorR;
  attribute float colorG;
  attribute float colorB;
  attribute float opacity;

  varying float vOpacity;
  varying vec3 vColor;

  uniform vec2 screenSize;

  void main() {
    // Reconstruct from SoA
    // Transform from screen space to world space
    float worldX = positionX - screenSize.x / 2.0;
    float worldY = -positionY + screenSize.y / 2.0;
    vec3 position = vec3(worldX, worldY, 0.0);
    
    vec3 color = vec3(colorR, colorG, colorB);
    
    vOpacity = opacity;
    vColor = color;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = 2.0;
  }
`

// Fragment shader
export const fragmentShader = `
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    if (vOpacity <= 0.0) discard;

    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;

    gl_FragColor = vec4(vColor, vOpacity);
  }
`
