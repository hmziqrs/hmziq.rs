import {
  SiFlutter,
  SiRust,
  SiReact,
  SiNextdotjs,
  SiHono,
  SiAdonisjs,
  SiDocker,
  type IconType,
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
  HonoJS: SiHono,
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
  HonoJS: '#E36002',
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
    return <IconComponent size={20} color={iconColor} strokeWidth={2} aria-hidden="true" />
  }

  return <IconComponent size={20} color={iconColor} aria-hidden="true" />
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
      className="relative flex items-center justify-center px-6 py-20"
    >
      <h2 className="sr-only">Skills</h2>
      <motion.div
        className="mx-auto max-w-6xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <ul className="flex max-w-6xl list-none flex-row flex-wrap justify-center gap-4" role="list">
          {skills.map((skill) => (
            <li key={skill}>
              <GlowTile
                icon={<SkillIcon skill={skill} />}
                label={skill}
                direction="row"
                className="to-white/[0.03] px-4 py-3 backdrop-blur-xl hover:to-white/[0.05]"
                variants={skillVariants}
                prefersReducedMotion={prefersReducedMotion}
              />
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  )
}
