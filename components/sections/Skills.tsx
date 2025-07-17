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
  SiDocker 
} from '@icons-pack/react-simple-icons'
import { 
  Workflow, 
  Building2, 
  Zap 
} from 'lucide-react'

// Skill to icon mapping
const skillIconMap: Record<string, React.ComponentType<any>> = {
  'Flutter': SiFlutter,
  'Dioxus': SiRust,
  'React': SiReact,
  'React Native': SiReact,
  'Next.JS': SiNextdotjs,
  'HonoJS': SiJavascript,
  'AdonisJS': SiAdonisjs,
  'Axum': SiRust,
  'Docker': SiDocker,
  'CI/CD': Workflow,
  'Architecture': Building2,
  'Animations': Zap,
}

// Skill color mapping for brand consistency
const skillColorMap: Record<string, string> = {
  'Flutter': '#02569B',
  'Dioxus': '#CE422B',
  'React': '#61DAFB',
  'React Native': '#61DAFB',
  'Next.JS': '#000000',
  'HonoJS': '#F7DF1E',
  'AdonisJS': '#5A45FF',
  'Axum': '#CE422B',
  'Docker': '#2496ED',
  'CI/CD': '#10B981',
  'Architecture': '#8B5CF6',
  'Animations': '#F59E0B',
}

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

  const renderSkillIcon = (skill: string) => {
    const IconComponent = skillIconMap[skill]
    if (!IconComponent) return null

    const iconColor = skillColorMap[skill] || '#9CA3AF'
    const isLucideIcon = ['CI/CD', 'Architecture', 'Animations'].includes(skill)

    if (isLucideIcon) {
      return (
        <IconComponent 
          size={20} 
          color={iconColor}
          strokeWidth={2}
        />
      )
    }

    return (
      <IconComponent 
        size={20} 
        color={iconColor}
        title={skill}
      />
    )
  }

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
                flex flex-col items-center gap-2
              `}>
                {/* Skill Icon */}
                <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                  {renderSkillIcon(skill)}
                </div>
                
                {/* Skill Name */}
                <span className="relative z-10 text-white font-medium text-xs md:text-sm tracking-wide leading-tight">
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