// Pure-CSS starfield used as an instant, zero-bundle backdrop before the WebGL
// field (Three.js + WASM) finishes loading. No client-only APIs so it renders
// during SSR and crossfades out once the WebGL field draws its first frame.

const RANGE_X = 2560
const RANGE_Y = 1440

const STAR_COLORS = ['#ffffff', 'rgb(153,204,255)', 'rgb(204,153,255)'] as const

// Deterministic LCG so the server and client render identical stars (no hydration mismatch).
function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function buildBoxShadow(count: number, seed: number): string {
  const rand = createRng(seed)
  const shadows: string[] = []
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * RANGE_X)
    const y = Math.round(rand() * RANGE_Y)
    const color = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)]
    shadows.push(`${x}px ${y}px ${color}`)
  }
  return shadows.join(', ')
}

interface StarLayer {
  size: number
  shadow: string
  duration: string
  opacity: number
}

// Computed once at module load — static across renders.
const LAYERS: StarLayer[] = [
  { size: 1, shadow: buildBoxShadow(140, 11), duration: '4s', opacity: 0.7 },
  { size: 2, shadow: buildBoxShadow(50, 29), duration: '6s', opacity: 0.85 },
  { size: 2, shadow: buildBoxShadow(18, 53), duration: '8s', opacity: 1 },
]

interface CSSStarFieldProps {
  /** When true, fades the whole field out (the WebGL field has taken over). */
  fadeOut?: boolean
}

export function CSSStarField({ fadeOut = false }: CSSStarFieldProps) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden"
      style={{
        zIndex: 1,
        backgroundColor: '#000000',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 600ms ease',
      }}
    >
      {LAYERS.map((layer, index) => (
        <div
          key={index}
          className="css-star-layer absolute top-0 left-0"
          style={{
            width: `${layer.size}px`,
            height: `${layer.size}px`,
            borderRadius: '50%',
            boxShadow: layer.shadow,
            opacity: layer.opacity,
            animationDuration: layer.duration,
          }}
        />
      ))}
    </div>
  )
}
