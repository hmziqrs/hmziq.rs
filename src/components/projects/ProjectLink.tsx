import type { ReactNode } from 'react'

interface ProjectLinkProps {
  href: string
  icon: ReactNode
  label: string
}

export function ProjectLink({ href, icon, label }: ProjectLinkProps) {
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
