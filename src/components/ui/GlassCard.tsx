import { type ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-none border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.06] ${className}`}
    >
      {children}
      {/* Hover shine sweep */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
      >
        <div
          className="absolute inset-0 -translate-x-full -translate-y-full transition-transform duration-700 group-focus-within:translate-x-0 group-focus-within:translate-y-0 group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:transition-none"
          style={{
            background:
              'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%)',
            width: '200%',
            height: '200%',
          }}
        />
      </div>
    </div>
  )
}
