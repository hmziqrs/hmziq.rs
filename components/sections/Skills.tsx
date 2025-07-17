'use client'

import { useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { userProfile } from '@/lib/content/UserProfile'

const Skills: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const skills = userProfile.skills
  const sectionRef = useRef<HTMLElement>(null)

  // Uniform styling for all skills
  const skillStyles = {
    gradient: 'from-gray-500/10 via-gray-600/5 to-transparent',
    border: 'border-gray-500/20 hover:border-gray-400/40',
    background: 'bg-gray-500/10 hover:bg-gray-500/20',
    borderColor: 'border-gray-500/20',
  }

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.8,
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    },
  }), [prefersReducedMotion])

  const titleVariants = useMemo(() => ({
    hidden: { y: prefersReducedMotion ? 0 : 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    },
  }), [prefersReducedMotion])

  const skillVariants = useMemo(() => ({
    hidden: { scale: prefersReducedMotion ? 1 : 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.4,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    },
  }), [prefersReducedMotion])

  return (
    <section
      ref={sectionRef}
      id="skills"
      className="relative min-h-screen flex items-center justify-center px-6 py-20"
      aria-labelledby="skills-heading"
    >
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        {/* Section Title */}
        <motion.h2
          id="skills-heading"
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-12 md:mb-16 text-white"
          variants={titleVariants}
        >
          Skills
        </motion.h2>

        {/* Skills Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
          {skills.map((skill, index) => (
            <motion.div
              key={skill}
              className="relative"
              variants={skillVariants}
              whileHover={prefersReducedMotion ? {} : { 
                scale: 1.05,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
            >
              <div className={`
                relative overflow-hidden rounded-lg border backdrop-blur-sm
                bg-gradient-to-br ${skillStyles.gradient}
                ${skillStyles.border}
                px-4 py-3 text-center
                transition-all duration-300
                hover:shadow-lg hover:shadow-black/10
                group
              `}>
                <span className="relative z-10 text-white font-medium text-sm tracking-wide">
                  {skill}
                </span>
                
                {/* Hover shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

export default Skills