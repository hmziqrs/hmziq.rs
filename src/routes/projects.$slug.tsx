import { SiGithub, SiGoogleplay, SiApple, SiNpm } from '@icons-pack/react-simple-icons'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, ExternalLink, Globe, ArrowRight } from 'lucide-react'

import { ErrorBoundary } from '~/components/ErrorBoundary'
import { MarkdownRenderer } from '~/components/MarkdownRenderer'
import { PageContainer } from '~/components/PageContainer'
import { useSectionVariants } from '~/hooks/useSectionVariants'
import { experience } from '~/lib/content/Experience'
import { projects, type Project } from '~/lib/content/Projects'
import { getTechIcon } from '~/lib/techIcons'

export const Route = createFileRoute('/projects/$slug')({
  head: ({ params }) => {
    const project = projects.findBySlug(params.slug)
    const title = project ? `${project.title} | Projects` : 'Project Not Found'
    return {
      meta: [{ title }],
    }
  },
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
          <div role="alert" className="flex min-h-screen items-center justify-center text-white">
            Something went wrong
          </div>
        }
      >
        <div className="mx-auto max-w-6xl">
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
            <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-sm text-white/60" aria-label={`${project.stars} GitHub stars`}>
              <Star size={14} fill="currentColor" className="text-yellow-500/80" aria-hidden="true" />
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
          <span className="rounded-lg bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/55">
            {project.context}
          </span>
        )}
        {project.period && (
          <span className="rounded-lg bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/55">
            {project.period}
          </span>
        )}
      </motion.div>

      {/* Linked experience */}
      {project.experienceSlug && (() => {
        const exp = experience.findBySlug(project.experienceSlug)
        if (!exp) return null
        return (
          <motion.div variants={itemVariants} className="mb-6">
            <Link
              to="/"
              hash="experience"
              className="group flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06] focus-visible:border-white/10 focus-visible:bg-white/[0.06]"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs text-white/50">Work Experience</span>
                <span className="font-mono text-sm text-white/60 group-hover:text-white/80 group-focus-visible:text-white/80 transition-colors">
                  {exp.role}{exp.company ? ` at ${exp.company}` : ''}
                </span>
              </div>
              <span className="ml-auto font-mono text-xs text-white/50">{exp.period}</span>
              <ArrowRight size={14} className="shrink-0 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/40 group-focus-visible:translate-x-0.5 group-focus-visible:text-white/40" />
            </Link>
          </motion.div>
        )
      })()}

      {/* Tech stack */}
      <motion.ul variants={itemVariants} className="mb-8 flex list-none flex-wrap gap-2">
        {project.tech.map((t) => {
          const { icon: Icon, color, abbr } = getTechIcon(t)
          return (
            <li
              key={t}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1 font-mono text-xs text-white/70"
            >
              {Icon ? (
                <Icon size={12} color={color} title={t} />
              ) : (
                <span className="font-mono text-[9px] font-bold" style={{ color }}>
                  {abbr}
                </span>
              )}
              {t}
            </li>
          )
        })}
      </motion.ul>

      {/* Links */}
      {links && (
        <motion.div variants={itemVariants} className="mb-10 flex flex-wrap gap-3">
          {links.github && (
            <LinkButton href={links.github} icon={<SiGithub size={14} />} label="GitHub" />
          )}
          {links.web && <LinkButton href={links.web} icon={<Globe size={14} />} label="Website" />}
          {links.playStore && (
            <LinkButton href={links.playStore} icon={<SiGoogleplay size={14} />} label="Play Store" />
          )}
          {links.appStore && (
            <LinkButton href={links.appStore} icon={<SiApple size={14} />} label="App Store" />
          )}
          {links.npm && (
            <LinkButton href={links.npm} icon={<SiNpm size={14} color="#CB3837" />} label="npm" />
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
      className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 font-mono text-xs text-white/60 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.1] hover:text-white/80 focus-visible:bg-white/[0.1] focus-visible:text-white/80"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  )
}
