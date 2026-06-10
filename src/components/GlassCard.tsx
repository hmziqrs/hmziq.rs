import { type ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** Show the hover shine effect. @default true */
  shine?: boolean
}

export function GlassCard({ children, className = '', shine = true }: GlassCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/2 bg-white/3 backdrop-blur-sm transition-all duration-500 hover:border-white/10 hover:bg-white/1 ${className}`}
    >
      {children}
      {shine && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-all duration-1000 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
        >
          <div
            className="absolute inset-0 -translate-x-full -translate-y-full transition-transform duration-1000 group-focus-within:translate-x-0 group-focus-within:translate-y-0 group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:transition-none"
            style={{
              background:
                'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.4) 50%, transparent 70%)',
              width: '200%',
              height: '200%',
            }}
          />
        </div>
      )}
    </div>
  )
}
