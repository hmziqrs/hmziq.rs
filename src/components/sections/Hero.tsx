import { motion, type Variants } from 'framer-motion'
import { lazy, Suspense } from 'react'

import WASMLoader from '~/components/WASMLoader'
import { useReducedMotion } from '~/hooks/useReducedMotion'
import { siteContent } from '~/lib/content/SiteContent'
import { userProfile } from '~/lib/content/UserProfile'

// Lazy import for Three.js component
const ScatterText = lazy(() => import('~/components/three/ScatterText'))

const Hero: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const { name, title } = userProfile.profile
  const { scrollText } = siteContent.ui

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 1,
        staggerChildren: prefersReducedMotion ? 0 : 0.2,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { y: prefersReducedMotion ? 0 : 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }

  return (
    <section id="hero" className="relative block min-h-screen w-full px-6">
      <motion.div
        className="flex min-h-screen w-full flex-col items-center justify-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Name with Scatter Text Effect */}
        <div className="relative h-32 w-xl">
          <WASMLoader
            loadingFallback={
              <div className="h-32 w-xl">
                <div className="text-6xl font-bold text-white md:text-7xl lg:text-8xl">{name}</div>
              </div>
            }
          >
            <Suspense fallback={null}>
              <ScatterText text={name} />
            </Suspense>
          </WASMLoader>
        </div>

        <motion.p
          className="text-xl font-light text-gray-400 md:text-2xl lg:text-3xl"
          variants={itemVariants}
        >
          {title}
        </motion.p>
        <div className="h-8" />
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 transform"
          variants={itemVariants}
        >
          <div className="flex flex-col items-center">
            <motion.div
              className="-right-1 flex h-10 w-6 justify-center rounded-full border-2 border-gray-600"
              whileHover={{ borderColor: '#ffffff', scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="mt-2 h-3 w-1 rounded-full bg-gray-400"
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        y: [0, 12, 0],
                        opacity: [1, 0.3, 1],
                      }
                }
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
            <div className="h-2" />
            <p className="text-sm tracking-widest text-gray-600">{scrollText}</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Hero
