// Vertex shader
export const vertexShader = `
  attribute float opacity;
  attribute vec3 color;

  varying float vOpacity;
  varying vec3 vColor;

  void main() {
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
