import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

interface BackLinkProps {
  to: string
  children?: React.ReactNode
  className?: string
}

export function BackLink({ to, children = 'Back', className = '' }: BackLinkProps) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 font-mono text-sm text-white/60 transition-colors hover:text-white/70 focus-visible:text-white/70 ${className}`}
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {children}
    </Link>
  )
}
