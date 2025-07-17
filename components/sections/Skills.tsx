'use client'

import { useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { userProfile } from '@/lib/content/UserProfile'

// Icon imports
import {
  SiFlutter,
  SiRust,
  SiReact,
  SiNextdotjs,
  SiJavascript,
  SiAdonisjs,
  SiDocker,
} from '@icons-pack/react-simple-icons'
import { Workflow, Building2, Zap } from 'lucide-react'

// Skill to icon mapping
const skillIconMap: Record<string, React.ComponentType<any>> = {
  Flutter: SiFlutter,
  Dioxus: SiRust,
  React: SiReact,
  'React Native': SiReact,
  'Next.JS': SiNextdotjs,
  HonoJS: SiJavascript,
  AdonisJS: SiAdonisjs,
  Axum: SiRust,
  Docker: SiDocker,
  'CI/CD': Workflow,
  Architecture: Building2,
  Animations: Zap,
}

// Skill color mapping for brand consistency
const skillColorMap: Record<string, string> = {
  Flutter: '#02569B',
  Dioxus: '#CE422B',
  React: '#61DAFB',
  'React Native': '#61DAFB',
  'Next.JS': '#FFFFFF',
  HonoJS: '#F7DF1E',
  AdonisJS: '#5A45FF',
  Axum: '#CE422B',
  Docker: '#2496ED',
  'CI/CD': '#10B981',
  Architecture: '#8B5CF6',
  Animations: '#F59E0B',
}

const Skills: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const skills = userProfile.skills
  const sectionRef = useRef<HTMLElement>(null)

  // Cosmic tile styling inspired by the provided design
  const skillStyles = {
    background: 'bg-gradient-radial from-transparent via-transparent to-white/[0.03]',
    hoverBackground: 'hover:to-white/[0.05]',
  }

  const containerVariants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          duration: prefersReducedMotion ? 0 : 0.8,
          staggerChildren: prefersReducedMotion ? 0 : 0.1,
          ease: [0.25, 0.1, 0.25, 1.0],
        },
      },
    }),
    [prefersReducedMotion]
  )

  const skillVariants = useMemo(
    () => ({
      hidden: { scale: prefersReducedMotion ? 1 : 0.9, opacity: 0 },
      visible: {
        scale: 1,
        opacity: 1,
        transition: {
          duration: prefersReducedMotion ? 0 : 0.4,
          ease: [0.25, 0.1, 0.25, 1.0],
        },
      },
    }),
    [prefersReducedMotion]
  )

  const renderSkillIcon = (skill: string) => {
    const IconComponent = skillIconMap[skill]
    if (!IconComponent) return null

    const iconColor = skillColorMap[skill] || '#9CA3AF'
    const isLucideIcon = ['CI/CD', 'Architecture', 'Animations'].includes(skill)

    if (isLucideIcon) {
      return <IconComponent size={20} color={iconColor} strokeWidth={2} />
    }

    return <IconComponent size={20} color={iconColor} title={skill} />
  }

  return (
    <section
      ref={sectionRef}
      id="skills"
      className="relative min-h-screen flex items-center justify-center px-6 py-20"
      aria-label="Skills"
    >
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        {/* Skills Grid */}
        <div className="flex flex-row flex-wrap justify-center gap-4 max-w-6xl">
          {skills.map((skill, index) => (
            <motion.div
              key={skill}
              variants={skillVariants}
              whileHover={
                prefersReducedMotion
                  ? {}
                  : {
                      scale: 1.15,
                      rotate: 3,
                      transition: { type: 'spring', stiffness: 400, damping: 25 },
                    }
              }
              className="cosmic-skill-tile"
            >
              <div
                className={`
                px-4 py-3
                relative rounded-lg
                backdrop-blur-sm
                transition-all duration-500
                group cursor-pointer
                flex flex-row items-center gap-2
                overflow-hidden
                ${skillStyles.background}
                ${skillStyles.hoverBackground}
              `}
              >
                {/* Nebula hint - varies by index */}
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background:
                      index % 2 === 0
                        ? 'radial-gradient(circle at 30% 30%, rgba(0, 128, 255, 0.05), transparent 80%)'
                        : index % 3 === 0
                          ? 'radial-gradient(circle at 50% 50%, rgba(255, 165, 0, 0.05), transparent 80%)'
                          : 'radial-gradient(circle at 70% 70%, rgba(255, 0, 128, 0.05), transparent 80%)',
                  }}
                />

                {/* Skill Icon */}
                <div className="transition-transform duration-300 group-hover:scale-110 z-10">
                  {renderSkillIcon(skill)}
                </div>

                {/* Skill Name */}
                <span className="relative z-10 text-white font-bold text-sm tracking-wide whitespace-nowrap bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  {skill}
                </span>

                {/* White shine effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none">
                  <div
                    className="absolute inset-0 -translate-x-full -translate-y-full group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-1000"
                    style={{
                      background:
                        'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.4) 50%, transparent 70%)',
                      width: '200%',
                      height: '200%',
                    }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

export default Skills
