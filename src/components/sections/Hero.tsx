import { lazy } from 'react'

import { ScrollIndicator } from '~/components/ui/ScrollIndicator'
import { SocialLinks } from '~/components/ui/SocialLinks'
import { WASMCanvas } from '~/components/wasm/WASMCanvas'
import userData from '~/content/data/user.json'
import { useReducedMotion } from '~/hooks/useReducedMotion'

const ScatterText = lazy(() => import('~/components/three/ScatterText'))

export default function Hero() {
  const prefersReducedMotion = useReducedMotion()
  const { name, title, tagline } = userData

  return (
    <section
      id="hero"
      tabIndex={-1}
      aria-label="Introduction"
      className="relative block min-h-screen w-full px-6"
    >
      <h1 className="sr-only">
        {name} — {title}
      </h1>
      <div className="flex min-h-screen w-full flex-col items-center justify-center text-center">
        <div className="relative h-32 w-full">
          <WASMCanvas
            loadingFallback={
              <div className="h-32 w-full">
                <div className="text-6xl font-bold text-white md:text-7xl lg:text-8xl">{name}</div>
              </div>
            }
          >
            <ScatterText text={name} />
          </WASMCanvas>
        </div>

        <p className="text-xl font-light md:text-2xl lg:text-3xl">
          {title}
        </p>

        <p className="max-w-lg py-2 font-mono text-sm font-medium text-white/75">
          {tagline}
        </p>
        <div className="h-4" />
        <div>
          <SocialLinks prefersReducedMotion={prefersReducedMotion} />
        </div>

        <ScrollIndicator prefersReducedMotion={prefersReducedMotion} />
      </div>
    </section>
  )
}
