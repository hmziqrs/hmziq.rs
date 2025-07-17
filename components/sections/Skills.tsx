'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { userProfile } from '@/lib/content/UserProfile'

const Skills: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const skillCategories = userProfile.skills
  const sectionRef = useRef<HTMLElement>(null)

  // Category-specific styling
  const getCategoryStyles = (title: string) => {
    const lowercaseTitle = title.toLowerCase()
    
    if (lowercaseTitle.includes('frontend')) {
      return {
        gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent',
        border: 'border-blue-500/20 hover:border-blue-400/40',
        accent: 'bg-blue-500/10',
        skillBg: 'bg-blue-500/10 hover:bg-blue-500/20',
        skillBorder: 'border-blue-500/20',
        icon: '🎨'
      }
    } else if (lowercaseTitle.includes('backend')) {
      return {
        gradient: 'from-purple-500/10 via-violet-500/5 to-transparent',
        border: 'border-purple-500/20 hover:border-purple-400/40',
        accent: 'bg-purple-500/10',
        skillBg: 'bg-purple-500/10 hover:bg-purple-500/20',
        skillBorder: 'border-purple-500/20',
        icon: '⚡'
      }
    } else {
      return {
        gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
        border: 'border-emerald-500/20 hover:border-emerald-400/40',
        accent: 'bg-emerald-500/10',
        skillBg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
        skillBorder: 'border-emerald-500/20',
        icon: '🚀'
      }
    }
  }

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
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        {/* Section Title */}
        <motion.h2
          className="text-4xl md:text-6xl font-bold text-center mb-16 text-white"
          variants={cardVariants}
        >
          Skills
        </motion.h2>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {skillCategories.map((category) => {
            const styles = getCategoryStyles(category.title)
            return (
              <motion.div 
                key={category.title} 
                className="relative group" 
                variants={cardVariants}
                whileHover={prefersReducedMotion ? {} : { y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {/* Card Background with Gradient */}
                <div className={`
                  relative overflow-hidden rounded-xl border backdrop-blur-sm
                  bg-gradient-to-br ${styles.gradient}
                  ${styles.border}
                  transition-all duration-500 ease-out
                  hover:shadow-2xl hover:shadow-black/20
                  p-8 h-full
                `}>
                  {/* Category Header */}
                  <div className="text-center mb-8">
                    <div className={`
                      inline-flex items-center justify-center w-16 h-16 rounded-full mb-4
                      ${styles.accent} border ${styles.skillBorder}
                      transition-transform duration-300 group-hover:scale-110
                    `}>
                      <span className="text-2xl">{styles.icon}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                      {category.title}
                    </h3>
                    <div className={`w-16 h-0.5 mx-auto ${styles.accent} rounded-full`} />
                  </div>

                  {/* Skills List */}
                  <div className="space-y-3">
                    {category.skills.map((skill, skillIndex) => (
                      <motion.div
                        key={skill}
                        className="relative"
                        variants={skillVariants}
                        custom={skillIndex}
                        whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className={`
                          relative overflow-hidden rounded-lg border backdrop-blur-sm
                          ${styles.skillBg} ${styles.skillBorder}
                          px-4 py-3 text-center
                          transition-all duration-300
                          hover:shadow-lg hover:shadow-black/10
                          group/skill
                        `}>
                          <span className="relative z-10 text-white font-medium text-sm tracking-wide">
                            {skill}
                          </span>
                          
                          {/* Hover shine effect */}
                          <div className="absolute inset-0 -translate-x-full group-hover/skill:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                    <div className={`w-full h-full rounded-full ${styles.accent} blur-xl`} />
                  </div>
                  
                  {/* Subtle animated border */}
                  <div className={`
                    absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
                    transition-opacity duration-500 pointer-events-none
                    bg-gradient-to-r ${styles.border} p-px
                  `}>
                    <div className="w-full h-full rounded-xl bg-black/80" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}

export default Skills