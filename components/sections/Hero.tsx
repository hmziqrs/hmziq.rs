'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const Hero: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()

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

  const floatingVariants = {
    initial: { y: 0 },
    animate: {
      y: prefersReducedMotion ? 0 : [-10, 10, -10],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6">
      <motion.div
        className="text-center max-w-4xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Name */}
        <motion.div variants={floatingVariants} initial="initial" animate="animate">
          <motion.h1
            className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-4"
            variants={itemVariants}
          >
            <span className="text-gradient">Hamza</span>
            <br />
            <span className="text-white">Iqbal</span>
          </motion.h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="text-xl md:text-2xl lg:text-3xl text-gray-400 mb-8 font-light tracking-wide"
          variants={itemVariants}
        >
          Senior Software Engineer
        </motion.p>

        {/* Subtitle */}
        <motion.p
          className="text-lg md:text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed"
          variants={itemVariants}
        >
          Crafting exceptional digital experiences with{' '}
          <span className="text-gray-300">9 years</span> of full-stack expertise
        </motion.p>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          variants={itemVariants}
        >
          <motion.div
            className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center"
            whileHover={{ borderColor: '#ffffff', scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-1 h-3 bg-gray-400 rounded-full mt-2"
              animate={prefersReducedMotion ? {} : {
                y: [0, 12, 0],
                opacity: [1, 0.3, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          <p className="text-gray-600 text-sm mt-2 tracking-widest">SCROLL</p>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Hero