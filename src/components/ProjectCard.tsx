import { Link } from '@tanstack/react-router'
import { motion, type TargetAndTransition, type Variants } from 'framer-motion'
import { Star, ArrowRight } from 'lucide-react'

import type { Project } from '~/lib/content/Projects'

interface ProjectCardProps {
  project: Project
  variants?: Variants
  prefersReducedMotion?: boolean
}

export function ProjectCard({ project, variants, prefersReducedMotion }: ProjectCardProps) {
  const hoverAnimation: TargetAndTransition | undefined = prefersReducedMotion
    ? undefined
    : {
        scale: 1.03,
        transition: { type: 'spring', stiffness: 400, damping: 25 },
      }

  const content = (
    <div className="group bg-gradient-radial relative flex h-full flex-col gap-3 overflow-hidden rounded-xl from-transparent via-transparent to-white/[0.05] p-5 shadow-[inset_0_0_20px_rgba(255,255,255,0.07),0_0_10px_rgba(255,255,255,0.03)] backdrop-blur-sm transition-all duration-500 hover:to-white/[0.08]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-sm font-semibold tracking-wide text-white group-hover:text-white/90">
          {project.title}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {project.stars != null && project.stars > 0 && (
            <span className="flex items-center gap-1 font-mono text-xs text-white/50">
              <Star size={12} fill="currentColor" className="text-yellow-500/80" />
              {project.stars}
            </span>
          )}
          <ArrowRight
            size={14}
            className="text-white/20 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/50"
          />
        </div>
      </div>

      {/* Description */}
      <p className="line-clamp-2 text-xs leading-relaxed text-white/40">{project.description}</p>

      {/* Tech pills */}
      <div className="mt-auto flex flex-wrap gap-1.5">
        {project.tech.slice(0, 5).map((t) => (
          <span
            key={t}
            className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/40"
          >
            {t}
          </span>
        ))}
        {project.tech.length > 5 && (
          <span className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-white/30">
            +{project.tech.length - 5}
          </span>
        )}
      </div>

      {/* Context badge */}
      {project.context && (
        <span className="absolute top-3 right-3 rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/30">
          {project.context}
        </span>
      )}

      {/* Hover shine */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-all duration-1000 group-hover:opacity-100">
        <div
          className="absolute inset-0 -translate-x-full -translate-y-full transition-transform duration-1000 group-hover:translate-x-0 group-hover:translate-y-0"
          style={{
            background:
              'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.15) 50%, transparent 70%)',
            width: '200%',
            height: '200%',
          }}
        />
      </div>
    </div>
  )

  return (
    <motion.div variants={variants} whileHover={hoverAnimation} className="h-full">
      <Link
        to="/projects/$slug"
        params={{ slug: project.slug }}
        aria-label={`${project.title} — ${project.description}`}
        className="block h-full"
      >
        {content}
      </Link>
    </motion.div>
  )
}
