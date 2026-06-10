import { SiGithub, SiGoogleplay, SiApple, SiNpm } from '@icons-pack/react-simple-icons'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Star, ExternalLink, Globe, ArrowRight } from 'lucide-react'

import { BackLink } from '~/components/BackLink'
import { ErrorBoundary } from '~/components/ErrorBoundary'
import { MarkdownRenderer } from '~/components/MarkdownRenderer'
import { PageContainer } from '~/components/PageContainer'
import { experience } from '~/lib/content/Experience'
import { projects, type Project } from '~/lib/content/Projects'
import { periodToDatetime } from '~/lib/dateUtils'
import { getTechIcon } from '~/lib/techIcons'

export const Route = createFileRoute('/projects/$slug')({
  head: ({ params }) => {
    const project = projects.findBySlug(params.slug)
    const title = project ? `${project.title} - Projects` : 'Project Not Found'
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
          <BackLink to="/projects" className="mt-4">
            Back to projects
          </BackLink>
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
  const links = project.links
  const hasReadme = project.readme && project.readme.length > 0

  return (
    <div className="animate-in">
      {/* Back link */}
      <div style={{ animationDelay: '0s' }} className="mb-8">
        <BackLink to="/projects">All projects</BackLink>
      </div>

      {/* Header */}
      <div style={{ animationDelay: '0.08s' }} className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-wide text-white md:text-3xl">
              {project.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{project.description}</p>
          </div>
          {project.stars != null && project.stars > 0 && (
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-sm text-white/60"
              aria-label={`${project.stars} GitHub stars`}
            >
              <Star
                size={14}
                fill="currentColor"
                className="text-yellow-500/80"
                aria-hidden="true"
              />
              {project.stars}
            </span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div style={{ animationDelay: '0.16s' }} className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-white/[0.06] px-3 py-1 font-mono text-xs text-white/60">
          {project.type}
        </span>
        {project.context && (
          <span className="rounded-lg bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/55">
            {project.context}
          </span>
        )}
        {project.period && (
          <time
            dateTime={periodToDatetime(project.period) ?? project.period}
            className="rounded-lg bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/55"
          >
            {project.period}
          </time>
        )}
      </div>

      {/* Linked experience */}
      {project.experienceSlug &&
        (() => {
          const exp = experience.findBySlug(project.experienceSlug)
          if (!exp) return null
          return (
            <div style={{ animationDelay: '0.24s' }} className="mb-6">
              <Link
                to="/"
                hash="experience"
                className="group flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06] focus-visible:border-white/10 focus-visible:bg-white/[0.06]"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs text-white/50">Work Experience</span>
                  <span className="font-mono text-sm text-white/60 transition-colors group-hover:text-white/80 group-focus-visible:text-white/80">
                    {exp.role}
                    {exp.company ? ` at ${exp.company}` : ''}
                  </span>
                </div>
                <span className="ml-auto font-mono text-xs text-white/50">{exp.period}</span>
                <ArrowRight
                  size={14}
                  className="shrink-0 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/40 group-focus-visible:translate-x-0.5 group-focus-visible:text-white/40"
                  aria-hidden="true"
                />
              </Link>
            </div>
          )
        })()}

      {/* Tech stack */}
      <ul
        style={{ animationDelay: '0.32s' }}
        className="mb-8 flex list-none flex-wrap gap-2"
        role="list"
      >
        {project.tech.map((t) => {
          const { icon: Icon, color, abbr } = getTechIcon(t)
          return (
            <li
              key={t}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1 font-mono text-xs text-white/70"
            >
              {Icon ? (
                <Icon size={12} color={color} aria-hidden="true" />
              ) : (
                <span
                  className="font-mono text-[9px] font-bold"
                  style={{ color }}
                  aria-hidden="true"
                >
                  {abbr}
                </span>
              )}
              {t}
            </li>
          )
        })}
      </ul>

      {/* Links */}
      {links && (
        <ul
          style={{ animationDelay: '0.40s' }}
          className="mb-10 flex list-none flex-wrap gap-3"
          role="list"
        >
          {links.github && (
            <li>
              <LinkButton
                href={links.github}
                icon={<SiGithub size={14} aria-hidden="true" />}
                label="GitHub"
              />
            </li>
          )}
          {links.web && (
            <li>
              <LinkButton
                href={links.web}
                icon={<Globe size={14} aria-hidden="true" />}
                label="Website"
              />
            </li>
          )}
          {links.playStore && (
            <li>
              <LinkButton
                href={links.playStore}
                icon={<SiGoogleplay size={14} aria-hidden="true" />}
                label="Play Store"
              />
            </li>
          )}
          {links.appStore && (
            <li>
              <LinkButton
                href={links.appStore}
                icon={<SiApple size={14} aria-hidden="true" />}
                label="App Store"
              />
            </li>
          )}
          {links.npm && (
            <li>
              <LinkButton
                href={links.npm}
                icon={<SiNpm size={14} color="#CB3837" aria-hidden="true" />}
                label="npm"
              />
            </li>
          )}
          {links.crates && (
            <li>
              <LinkButton
                href={links.crates}
                icon={<ExternalLink size={14} aria-hidden="true" />}
                label="crates.io"
              />
            </li>
          )}
        </ul>
      )}

      {/* Divider */}
      {hasReadme && <hr className="mb-10 border-white/10" />}

      {/* README content */}
      {hasReadme && (
        <article style={{ animationDelay: '0.48s' }} className="prose-project">
          <MarkdownRenderer content={project.readme!} />
        </article>
      )}
    </div>
  )
}

function LinkButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 font-mono text-xs text-white/60 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.1] hover:text-white/80 focus-visible:bg-white/[0.1] focus-visible:text-white/80"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  )
}
