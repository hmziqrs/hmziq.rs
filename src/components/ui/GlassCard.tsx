import { type ReactNode } from 'react'

import { Card } from './Card'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <Card variant="glass" interactive rounded="none" className={className}>
      {children}
    </Card>
  )
}
