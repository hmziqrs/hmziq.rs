import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, X } from 'lucide-react'
import { lazy, useMemo, useState, useCallback } from 'react'

import { ErrorBoundary } from '~/components/ErrorBoundary'
import { ProjectCard } from '~/components/ProjectCard'
import { WASMCanvas } from '~/components/WASMCanvas'
import { useSectionVariants } from '~/hooks/useSectionVariants'
import { projects, type Project } from '~/lib/content/Projects'

const StarField3D = lazy(() => import('~/components/three/StarField'))

const blackFallback = (
  <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: -10 }} />
)

export const Route = createFileRoute('/projects')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const location = useLocation()
  const isIndex = location.pathname === '/projects'

  if (!isIndex) {
    return (
      <main className="relative min-h-screen">
        <WASMCanvas loadingFallback={blackFallback} errorFallback={blackFallback}>
          <StarField3D />
        </WASMCanvas>
        <ErrorBoundary
          fallback={
            <div className="flex min-h-screen items-center justify-center text-white">
              Something went wrong
            </div>
          }
        >
          <Outlet />
        </ErrorBoundary>
      </main>
    )
  }

  return <ProjectsListing />
}

function ProjectsListing() {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<Project['type'] | undefined>()

  const { containerVariants, itemVariants, prefersReducedMotion } = useSectionVariants({
    containerDuration: 0.6,
    staggerChildren: 0.05,
    itemDuration: 0.3,
    itemY: 15,
    ease: [0.25, 0.1, 0.25, 1.0],
  })

  const allSkills = useMemo(() => projects.skills, [])
  const allTypes = useMemo(() => projects.types, [])

  const filtered = useMemo(
    () => projects.filter(selectedSkills.length > 0 ? selectedSkills : undefined, selectedType),
    [selectedSkills, selectedType]
  )

  const toggleSkill = useCallback((skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }, [])

  const toggleType = useCallback((type: Project['type']) => {
    setSelectedType((prev) => (prev === type ? undefined : type))
  }, [])

  const clearFilters = useCallback(() => {
    setSelectedSkills([])
    setSelectedType(undefined)
  }, [])

  const hasFilters = selectedSkills.length > 0 || selectedType != null

  return (
    <main className="relative min-h-screen">
      <WASMCanvas loadingFallback={blackFallback} errorFallback={blackFallback}>
        <StarField3D />
      </WASMCanvas>

      <ErrorBoundary
        fallback={
          <div className="flex min-h-screen items-center justify-center text-white">
            Something went wrong
          </div>
        }
      >
        <div className="relative px-6 py-20" style={{ zIndex: 10 }}>
          <div className="mx-auto max-w-6xl">
            {/* Header */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-12"
            >
              <motion.div variants={itemVariants} className="mb-6">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 font-mono text-sm text-white/40 transition-colors hover:text-white/70"
                >
                  <ArrowLeft size={14} />
                  Back home
                </Link>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="font-mono text-2xl font-bold tracking-wider text-white md:text-3xl"
              >
                Projects
              </motion.h1>
              <motion.p variants={itemVariants} className="mt-2 font-mono text-sm text-white/40">
                {filtered.length} of {projects.all.length} projects
                {hasFilters && ' (filtered)'}
              </motion.p>
            </motion.div>

            {/* Filters */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-10 space-y-4"
            >
              {/* Type filter */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-white/30">Type:</span>
                {allTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-all duration-200 ${
                      selectedType === type
                        ? 'bg-white/15 text-white'
                        : 'bg-white/[0.05] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </motion.div>

              {/* Skill filter */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-white/30">Skills:</span>
                {allSkills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-all duration-200 ${
                      selectedSkills.includes(skill)
                        ? 'bg-white/15 text-white'
                        : 'bg-white/[0.05] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </motion.div>

              {/* Clear filters */}
              {hasFilters && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                >
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-xs text-white/50 transition-all hover:bg-white/[0.1] hover:text-white/70"
                  >
                    <X size={12} />
                    Clear filters
                  </button>
                  {selectedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedSkills.map((s) => (
                        <button
                          key={s}
                          onClick={() => toggleSkill(s)}
                          className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/60 transition-colors hover:bg-white/15"
                        >
                          {s} ×
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* Project grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((project) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  variants={itemVariants}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </motion.div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center"
              >
                <p className="font-mono text-sm text-white/30">
                  No projects match the selected filters.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 font-mono text-sm text-white/50 underline underline-offset-4 transition-colors hover:text-white/70"
                >
                  Clear all filters
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </main>
  )
}
