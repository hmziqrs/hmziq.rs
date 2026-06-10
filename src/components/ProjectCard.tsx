import { Link } from '@tanstack/react-router'
import { motion, type Variants } from 'framer-motion'
import { Star, ArrowRight } from 'lucide-react'

import type { Project } from '~/lib/content/Projects'
import { getTechIcon } from '~/lib/techIcons'

interface ProjectCardProps {
  project: Project
  variants?: Variants
  headingLevel?: 'h2' | 'h3'
}

function TechBadge({ tech }: { tech: string }) {
  const { icon: Icon, color, abbr } = getTechIcon(tech)

  return (
    <span className="group/badge relative inline-flex">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/10 transition-colors group-hover/badge:border-white/20 group-hover/badge:bg-white/15"
        title={tech}
      >
        {Icon ? (
          <Icon size={14} color={color} title={tech} />
        ) : (
          <span aria-hidden="true" className="font-mono text-[9px] font-bold" style={{ color }}>
            {abbr}
          </span>
        )}
      </span>
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 font-mono text-[10px] whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover/badge:opacity-100">
        {tech}
      </span>
    </span>
  )
}

export function ProjectCard({ project, variants, headingLevel: Heading = 'h2' }: ProjectCardProps) {
  const content = (
    <div className="group relative flex h-full flex-col gap-3 overflow-hidden border border-white/2 bg-white/3 px-6 py-4 backdrop-blur-sm transition-all duration-500 focus-within:border-white/10 focus-within:bg-white/1 hover:border-white/10 hover:bg-white/1">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Heading className="truncate font-mono text-sm font-semibold tracking-wide text-white group-focus-within:text-white/90 group-hover:text-white/90">
            {project.title}
          </Heading>
          {project.context && (
            <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/65">
              {project.context}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {project.stars != null && project.stars > 0 && (
            <span
              className="flex items-center gap-1 font-mono text-xs text-white/65"
              aria-label={`${project.stars} GitHub stars`}
            >
              <Star
                size={12}
                fill="currentColor"
                className="text-yellow-500/80"
                aria-hidden="true"
              />
              {project.stars}
            </span>
          )}
          <ArrowRight
            size={14}
            aria-hidden="true"
            className="text-white/30 transition-all duration-300 group-focus-within:translate-x-0.5 group-focus-within:text-white/60 group-hover:translate-x-0.5 group-hover:text-white/60"
          />
        </div>
      </div>

      {/* Description */}
      <p className="line-clamp-2 text-xs leading-relaxed text-white/60">{project.description}</p>

      {/* Tech icons */}
      <div className="mt-auto flex flex-wrap gap-1.5">
        {project.tech.slice(0, 5).map((t) => (
          <TechBadge key={t} tech={t} />
        ))}
        {project.tech.length > 5 && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/10 font-mono text-[10px] text-white/55"
            aria-label={`+${project.tech.length - 5} more technologies`}
          >
            +{project.tech.length - 5}
          </span>
        )}
      </div>

      {/* Hover shine */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-all duration-1000 motion-reduce:transition-none group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <div
          className="absolute inset-0 -translate-x-full -translate-y-full transition-transform duration-1000 group-focus-within:translate-x-0 group-focus-within:translate-y-0 group-hover:translate-x-0 group-hover:translate-y-0"
          style={{
            background:
              'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.4) 50%, transparent 70%)',
            width: '200%',
            height: '200%',
          }}
        />
      </div>
    </div>
  )

  return (
    <motion.article variants={variants} className="h-full">
      <Link
        to="/projects/$slug"
        params={{ slug: project.slug }}
        aria-label={`${project.title} — ${project.description}`}
        className="block h-full"
      >
        {content}
      </Link>
    </motion.article>
  )
}
