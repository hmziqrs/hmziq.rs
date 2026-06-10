import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useMemo, useState, useCallback } from 'react'

import { ErrorBoundary } from '~/components/ErrorBoundary'
import { PageContainer } from '~/components/PageContainer'
import { ProjectCard } from '~/components/ProjectCard'
import { useSectionVariants } from '~/hooks/useSectionVariants'
import { projects, type Project } from '~/lib/content/Projects'

export const Route = createFileRoute('/projects')({
  component: ProjectsPage,
  head: () => ({
    meta: [{ title: 'Projects - hmziq.rs' }],
  }),
})

function ProjectsPage() {
  const location = useLocation()
  const isIndex = location.pathname === '/projects'

  if (!isIndex) {
    return (
      <ErrorBoundary
        fallback={
          <PageContainer contentClassName="flex min-h-screen items-center justify-center">
            <div className="text-white" role="alert">
              Something went wrong
            </div>
          </PageContainer>
        }
      >
        <Outlet />
      </ErrorBoundary>
    )
  }

  return <ProjectsListing />
}

function ProjectsListing() {
  const [selectedType, setSelectedType] = useState<Project['type'] | undefined>()

  const { containerVariants, itemVariants } = useSectionVariants({
    containerDuration: 0.6,
    staggerChildren: 0.05,
    itemDuration: 0.3,
    itemY: 15,
    ease: [0.25, 0.1, 0.25, 1.0],
  })

  const allTypes = useMemo(() => projects.types, [])

  const filtered = useMemo(() => {
    let result = projects.all
    if (selectedType) {
      result = result.filter((p) => p.type === selectedType)
    }
    return [...result].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
  }, [selectedType])

  const toggleType = useCallback((type: Project['type']) => {
    setSelectedType((prev) => (prev === type ? undefined : type))
  }, [])

  return (
    <PageContainer contentClassName="px-6 py-20">
      <ErrorBoundary
        fallback={
          <div role="alert" className="flex min-h-screen items-center justify-center text-white">
            Something went wrong
          </div>
        }
      >
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
                className="inline-flex items-center gap-2 font-mono text-sm text-white/60 transition-colors hover:text-white/70 focus-visible:text-white/70"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back home
              </Link>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="font-mono text-2xl font-bold tracking-wider text-white md:text-3xl"
            >
              Projects
            </motion.h1>
            <motion.p
              variants={itemVariants}
              aria-live="polite"
              className="mt-2 font-mono text-sm text-white/55"
            >
              {filtered.length} of {projects.all.length} projects
              {selectedType && ' (filtered)'}
            </motion.p>
          </motion.div>

          {/* Type filter */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-10"
          >
            <motion.div
              variants={itemVariants}
              role="group"
              aria-label="Filter by type"
              className="flex flex-wrap items-center gap-2"
            >
              <span className="font-mono text-xs text-white/60">Type:</span>
              {allTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  aria-pressed={selectedType === type}
                  className={`rounded-lg px-4 py-2.5 font-mono text-xs transition-all duration-200 ${
                    selectedType === type
                      ? 'bg-white/15 text-white'
                      : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white/60 focus-visible:bg-white/[0.08] focus-visible:text-white/60'
                  }`}
                >
                  {type}
                </button>
              ))}
            </motion.div>
          </motion.div>

          {/* Project grid */}
          <motion.ul
            role="list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((project) => (
              <li key={project.slug}>
                <ProjectCard project={project} variants={itemVariants} />
              </li>
            ))}
          </motion.ul>

          {/* Empty state */}
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              role="status"
              className="py-20 text-center"
            >
              <p className="font-mono text-sm text-white/55">
                No projects match the selected filters.
              </p>
              <button
                onClick={() => setSelectedType(undefined)}
                className="mt-4 font-mono text-sm text-white/50 underline underline-offset-4 transition-colors hover:text-white/70 focus-visible:text-white/70"
              >
                Clear filter
              </button>
            </motion.div>
          )}
        </div>
      </ErrorBoundary>
    </PageContainer>
  )
}
