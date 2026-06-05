import { SiGithub } from '@icons-pack/react-simple-icons'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, ExternalLink, Globe, Smartphone } from 'lucide-react'

import { ErrorBoundary } from '~/components/ErrorBoundary'
import { MarkdownRenderer } from '~/components/MarkdownRenderer'
import { PageContainer } from '~/components/PageContainer'
import { useSectionVariants } from '~/hooks/useSectionVariants'
import { projects, type Project } from '~/lib/content/Projects'

export const Route = createFileRoute('/projects/$slug')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { slug } = Route.useParams()
  const project = projects.findBySlug(slug)

  if (!project) {
    return (
      <PageContainer contentClassName="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-mono text-2xl font-bold text-white">Project not found</h1>
          <Link
            to="/projects"
            className="mt-4 inline-flex items-center gap-2 font-mono text-sm text-white/50 hover:text-white/70"
          >
            <ArrowLeft size={14} />
            Back to projects
          </Link>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer contentClassName="px-6 py-20">
      <ErrorBoundary
        fallback={
          <div className="flex min-h-screen items-center justify-center text-white">
            Something went wrong
          </div>
        }
      >
        <div className="mx-auto max-w-3xl">
          <ProjectDetail project={project} />
        </div>
      </ErrorBoundary>
    </PageContainer>
  )
}

function ProjectDetail({ project }: { project: Project }) {
  const { containerVariants, itemVariants } = useSectionVariants({
    containerDuration: 0.6,
    staggerChildren: 0.08,
    itemDuration: 0.3,
    itemY: 15,
    ease: [0.25, 0.1, 0.25, 1.0],
  })

  const links = project.links
  const hasReadme = project.readme && project.readme.length > 0

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Back link */}
      <motion.div variants={itemVariants} className="mb-8">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 font-mono text-sm text-white/40 transition-colors hover:text-white/70"
        >
          <ArrowLeft size={14} />
          All projects
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-wide text-white md:text-3xl">
              {project.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/50">{project.description}</p>
          </div>
          {project.stars != null && project.stars > 0 && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-sm text-white/60">
              <Star size={14} fill="currentColor" className="text-yellow-500/80" />
              {project.stars}
            </span>
          )}
        </div>
      </motion.div>

      {/* Meta row */}
      <motion.div variants={itemVariants} className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-white/[0.06] px-3 py-1 font-mono text-xs text-white/50">
          {project.type}
        </span>
        {project.context && (
          <span className="rounded-lg bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/40">
            {project.context}
          </span>
        )}
        {project.period && (
          <span className="rounded-lg bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/40">
            {project.period}
          </span>
        )}
      </motion.div>

      {/* Tech stack */}
      <motion.div variants={itemVariants} className="mb-8 flex flex-wrap gap-2">
        {project.tech.map((t) => (
          <span
            key={t}
            className="rounded-lg bg-white/[0.06] px-3 py-1 font-mono text-xs text-white/50"
          >
            {t}
          </span>
        ))}
      </motion.div>

      {/* Links */}
      {links && (
        <motion.div variants={itemVariants} className="mb-10 flex flex-wrap gap-3">
          {links.github && (
            <LinkButton href={links.github} icon={<SiGithub size={14} />} label="GitHub" />
          )}
          {links.web && <LinkButton href={links.web} icon={<Globe size={14} />} label="Website" />}
          {links.playStore && (
            <LinkButton href={links.playStore} icon={<Smartphone size={14} />} label="Play Store" />
          )}
          {links.appStore && (
            <LinkButton href={links.appStore} icon={<Smartphone size={14} />} label="App Store" />
          )}
          {links.npm && (
            <LinkButton href={links.npm} icon={<ExternalLink size={14} />} label="npm" />
          )}
          {links.crates && (
            <LinkButton href={links.crates} icon={<ExternalLink size={14} />} label="crates.io" />
          )}
        </motion.div>
      )}

      {/* Divider */}
      {hasReadme && <hr className="mb-10 border-white/10" />}

      {/* README content */}
      {hasReadme && (
        <motion.article variants={itemVariants} className="prose-project">
          <MarkdownRenderer content={project.readme!} />
        </motion.article>
      )}
    </motion.div>
  )
}

function LinkButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 font-mono text-xs text-white/60 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.1] hover:text-white/80"
    >
      {icon}
      {label}
    </a>
  )
}
