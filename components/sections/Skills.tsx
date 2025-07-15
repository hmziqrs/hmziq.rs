'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { userProfile } from '@/lib/content/UserProfile'

// Dynamic import for 3D components
const SkillUniverse = dynamic(() => import('@/components/three/skills/SkillUniverse'), { 
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading 3D expertise...</div>
    </div>
  )
})

const Skills: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const skillCategories = userProfile.skills
  const sectionRef = useRef<HTMLElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const [isVisible, setIsVisible] = useState(false)

  // Mouse tracking for parallax
  useEffect(() => {
    if (prefersReducedMotion) return

    const handleMouseMove = (event: MouseEvent) => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width
        const y = (event.clientY - rect.top) / rect.height
        setMousePosition({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) })
      }
    }

    const section = sectionRef.current
    if (section) {
      section.addEventListener('mousemove', handleMouseMove)
      return () => section.removeEventListener('mousemove', handleMouseMove)
    }
  }, [prefersReducedMotion])

  // Intersection observer for visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.8,
        staggerChildren: prefersReducedMotion ? 0 : 0.2,
      },
    },
  }

  const cardVariants = {
    hidden: { y: prefersReducedMotion ? 0 : 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: 'easeOut',
      },
    },
  }

  const skillVariants = {
    hidden: { scale: prefersReducedMotion ? 1 : 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.4,
        ease: 'easeOut',
      },
    },
  }

  return (
    <section
      ref={sectionRef}
      id="skills"
      className="relative min-h-screen flex items-center justify-center px-6 py-20"
    >
      {/* 3D Skill Universe - Full section background */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 w-full h-full">
          <SkillUniverse 
            mousePosition={mousePosition}
            isVisible={isVisible}
          />
        </div>
      )}

      <motion.div
        className="max-w-6xl mx-auto relative z-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >

        {/* Fallback traditional layout (when motion is reduced) */}
        {prefersReducedMotion && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-20">
            {skillCategories.map((category) => (
              <motion.div key={category.title} className="relative group" variants={cardVariants}>
                <div className="bg-dark-200 border border-gray-800 rounded-lg p-8 h-full transition-all duration-300 hover:border-gray-600 hover:bg-dark-100">
                  {/* Category Header */}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{category.title}</h3>
                  </div>

                  {/* Skills Grid */}
                  <div className="space-y-3">
                    {category.skills.map((skill, skillIndex) => (
                      <motion.div
                        key={skill}
                        className="flex items-center justify-center"
                        variants={skillVariants}
                        custom={skillIndex}
                      >
                        <div className="bg-gray-800 text-gray-300 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors duration-200 w-full text-center">
                          {skill}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-transparent via-transparent to-star-blue opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Instructions for 3D mode */}
        {!prefersReducedMotion && (
          <motion.div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center z-20 bg-black/30 backdrop-blur-sm rounded-lg px-6 py-3"
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <p className="text-gray-300 text-sm mb-2">
              Hover over skills to see connections • Click to explore
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Frontend</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span>Backend</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                <span>Cross-Platform</span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Background gradient for 3D mode */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-transparent pointer-events-none" />
      )}
    </section>
  )
}

export default Skills