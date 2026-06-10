import { motion } from 'framer-motion'
import { lazy } from 'react'

import { ScrollIndicator } from '~/components/ScrollIndicator'
import { SocialLinks } from '~/components/SocialLinks'
import { WASMCanvas } from '~/components/WASMCanvas'
import { useSectionVariants } from '~/hooks/useSectionVariants'
import { siteContent } from '~/lib/content/SiteContent'
import type { Profile } from '~/lib/content/types'
import { userProfile } from '~/lib/content/UserProfile'

const ScatterText = lazy(() => import('~/components/three/ScatterText'))

export default function Hero() {
  const { containerVariants, itemVariants, prefersReducedMotion } = useSectionVariants({
    containerDuration: 1,
    itemDuration: 0.8,
    itemY: 50,
    ease: [0.25, 0.46, 0.45, 0.94],
  })

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
      <motion.div
        className="flex min-h-screen w-full flex-col items-center justify-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
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

        <motion.p
          className="text-xl font-light text-gray-300 md:text-2xl lg:text-3xl"
          variants={itemVariants}
        >
          {title}
        </motion.p>

        <motion.p
          className="max-w-lg text-sm font-light text-white/60 md:text-base"
          variants={itemVariants}
        >
          {tagline}
        </motion.p>

        <motion.div variants={itemVariants}>
          <SocialLinks
            links={userProfile.getPrimarySocialLinks()}
            prefersReducedMotion={prefersReducedMotion}
          />
        </motion.div>

        <ScrollIndicator scrollText={scrollText} prefersReducedMotion={prefersReducedMotion} />
      </motion.div>
    </section>
  )
}
