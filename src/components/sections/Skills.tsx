import {
  SiFlutter,
  SiRust,
  SiReact,
  SiNextdotjs,
  SiJavascript,
  SiAdonisjs,
  SiDocker,
  IconType,
} from '@icons-pack/react-simple-icons'
import { motion } from 'framer-motion'
import { Workflow, Building2, Zap } from 'lucide-react'

import { GlowTile } from '~/components/GlowTile'
import { useSectionVariants } from '~/hooks/useSectionVariants'
import { userProfile } from '~/lib/content/UserProfile'

const skillIconMap: Record<string, IconType> = {
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

const LUCIDE_SKILLS = ['CI/CD', 'Architecture', 'Animations']

function SkillIcon({ skill }: { skill: string }) {
  const IconComponent = skillIconMap[skill]
  if (!IconComponent) return null

  const iconColor = skillColorMap[skill] || '#9CA3AF'

  if (LUCIDE_SKILLS.includes(skill)) {
    return <IconComponent size={20} color={iconColor} strokeWidth={2} />
  }

  return <IconComponent size={20} color={iconColor} title={skill} />
}

export default function Skills() {
  const {
    containerVariants,
    itemVariants: skillVariants,
    prefersReducedMotion,
  } = useSectionVariants({
    containerDuration: 0.8,
    staggerChildren: 0.1,
    itemDuration: 0.4,
    itemY: 0,
    ease: [0.25, 0.1, 0.25, 1.0],
  })
  const skills = userProfile.skills

  return (
    <section
      id="skills"
      className="relative flex min-h-screen items-center justify-center px-6 py-20"
      aria-label="Skills"
    >
      <motion.div
        className="mx-auto max-w-6xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <div className="flex max-w-6xl flex-row flex-wrap justify-center gap-4">
          {skills.map((skill) => (
            <GlowTile
              key={skill}
              icon={<SkillIcon skill={skill} />}
              label={skill}
              direction="row"
              className="to-white/[0.03] px-4 py-3 backdrop-blur-xl hover:to-white/[0.05]"
              variants={skillVariants}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </motion.div>
    </section>
  )
}
