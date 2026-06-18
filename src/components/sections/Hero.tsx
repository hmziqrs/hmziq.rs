import { lazy } from 'react'

import { CTAButton } from '~/components/ui/CTAButton'
import { ScrollIndicator } from '~/components/ui/ScrollIndicator'
import { SocialLinks } from '~/components/ui/SocialLinks'
import { WASMCanvas } from '~/components/wasm/WASMCanvas'
import userData from '~/content/data/user.json'
import { useReducedMotion } from '~/hooks/useReducedMotion'

const ScatterText = lazy(() => import('~/components/three/ScatterText'))

export default function Hero() {
  const prefersReducedMotion = useReducedMotion()
  const { name, title, tagline, websites } = userData
  const cvUrl = websites.cv

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
                <div className="text-fg-primary text-6xl font-bold md:text-7xl lg:text-8xl">
                  {name}
                </div>
              </div>
            }
          >
            <ScatterText text={name} />
          </WASMCanvas>
        </div>

        <p className="text-fg-meta mt-2 font-mono text-sm font-medium tracking-[0.2em] uppercase md:text-base">
          {title}
        </p>

        <p className="max-w-hero text-fg-body mt-5 py-1 font-mono text-base font-medium md:text-lg">
          {tagline}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <CTAButton href="#projects" prefersReducedMotion={prefersReducedMotion}>
            See my work
          </CTAButton>
          <CTAButton
            href={cvUrl}
            variant="ghost"
            external
            prefersReducedMotion={prefersReducedMotion}
          >
            Read CV <span aria-hidden="true">↗</span>
          </CTAButton>
        </div>

        <div className="mt-10">
          <SocialLinks prefersReducedMotion={prefersReducedMotion} />
        </div>

        <ScrollIndicator prefersReducedMotion={prefersReducedMotion} />
      </div>
    </section>
  )
}
