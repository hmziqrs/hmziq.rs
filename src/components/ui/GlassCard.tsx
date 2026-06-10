import { type ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-none border border-white/[0.08] transition-all duration-500 hover:border-white/[0.12] ${className}`}
    >
      {/* Blurred frosted glass layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-white/[0.04]"
        style={{ filter: 'blur(8px)' }}
      />
      {children}
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
        >
        </div>
      </div>
    </div>
  )
}
