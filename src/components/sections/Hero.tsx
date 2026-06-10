import { lazy } from 'react'

import { ScrollIndicator } from '~/components/ScrollIndicator'
import { SocialLinks } from '~/components/SocialLinks'
import { WASMCanvas } from '~/components/WASMCanvas'
import { useReducedMotion } from '~/hooks/useReducedMotion'
import { siteContent } from '~/lib/content/SiteContent'
import type { Profile } from '~/lib/content/types'
import { userProfile } from '~/lib/content/UserProfile'

const ScatterText = lazy(() => import('~/components/three/ScatterText'))

const slideUpLgStyle = (delay: number): React.CSSProperties => ({
  animation: `slideUpLg 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`,
  animationDelay: `${delay}s`,
})

export default function Hero() {
  const prefersReducedMotion = useReducedMotion()
  const { name, title, tagline }: Profile = userProfile.profile
  const { scrollText } = siteContent.ui

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
      <div className="animate-in flex min-h-screen w-full flex-col items-center justify-center text-center">
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

        <p
          className="text-xl font-light md:text-2xl lg:text-3xl"
          style={slideUpLgStyle(0.2)}
        >
          {title}
        </p>

        <p
          className="max-w-lg font-mono font-medium text-white/75 text-sm py-2"
          style={slideUpLgStyle(0.4)}
        >
          {tagline}
        </p>
            <div className="h-4" />
        <div style={slideUpLgStyle(0.6)}>
          <SocialLinks
            links={userProfile.getPrimarySocialLinks()}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>

        <ScrollIndicator scrollText={scrollText} prefersReducedMotion={prefersReducedMotion} />
      </div>
    </section>
  )
}
