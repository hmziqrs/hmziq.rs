'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { userProfile } from '@/lib/content/UserProfile'
import { siteContent } from '@/lib/content/SiteContent'
import WASMLoader from '@/components/WASMLoader'

// Dynamic import for Three.js component
const ScatterText = dynamic(() => import('@/components/three/ScatterText'), {
  ssr: false,
})

const Hero: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const { name, title } = userProfile.profile
  const { scrollText } = siteContent.ui

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 1,
        staggerChildren: prefersReducedMotion ? 0 : 0.2,
      },
    },
  }

  const itemVariants = {
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
    <section id="hero" className="relative min-h-screen flex items-center  px-6 w-full">
      <motion.div
        className="text-center max-w-full mx-auto px-8   w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Name with Scatter Text Effect */}
        <div className="h-[160px] md:h-[200px] lg:h-[240px] w-full mx-auto">
          <WASMLoader
            loadingFallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-6xl md:text-7xl lg:text-8xl font-bold text-white">{name}</div>
              </div>
            }
          >
            <ScatterText
              text={name}
              fontFamily="geistMono"
              color="white"
              skip={8}
              autoAnimate={!prefersReducedMotion}
              height="100%"
            />
          </WASMLoader>
        </div>

        {/* Tagline */}
        <motion.p
          className="text-xl md:text-2xl lg:text-3xl text-gray-400 mb-100 font-light tracking-wide "
          variants={itemVariants}
        >
          {title}
        </motion.p>

        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          variants={itemVariants}
        >
          <div className="flex flex-col items-center">
            <motion.div
              className="w-6 h-10 border-2 -right-1 border-gray-600 rounded-full flex justify-center"
              whileHover={{ borderColor: '#ffffff', scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="w-1 h-3 bg-gray-400 rounded-full mt-2"
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
            <p className="text-gray-600 text-sm tracking-widest">{scrollText}</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Hero
