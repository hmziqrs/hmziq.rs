export const vertexShader = `
  // One particle per grid cell. The cell's coverage is read from the rasterized
  // text texture (no CPU readback); covered cells form the glyphs, the rest are culled.
  // 'position' (vec3) is injected by ShaderMaterial; the particle id is packed in position.x.

  uniform sampler2D uText;   // rasterized text (alpha = glyph coverage)
  uniform vec2 uGrid;        // (gridW, gridH) active cells
  uniform vec2 screenSize;   // container size in px
  uniform float uTime;       // seconds since formation start

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    float id = position.x;
    vec2 cell = vec2(mod(id, uGrid.x), floor(id / uGrid.x));
    vec2 uv = (cell + 0.5) / uGrid;

    // Cull cells that aren't part of a glyph.
    float cover = texture2D(uText, uv).a;
    if (cover < 0.5) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }

    // Target = the cell's screen position; start = a per-cell scattered point.
    vec2 target = uv * screenSize;
    vec2 start = vec2(hash(uv), hash(uv + 7.31)) * screenSize;

    // Closed-form exponential ease (rate 5 ≈ the old 0.08/frame@60, now FPS-independent).
    vec2 p = mix(target, start, exp(-uTime * 5.0));

    // Screen space -> centered world space.
    float worldX = p.x - screenSize.x * 0.5;
    float worldY = -p.y + screenSize.y * 0.5;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldX, worldY, 0.0, 1.0);
    gl_PointSize = 2.0;
  }
`

export const fragmentShader = `
  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    if (dot(cxy, cxy) > 1.0) discard;

    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`
