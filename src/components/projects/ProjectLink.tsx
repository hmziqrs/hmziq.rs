import type { ReactNode } from 'react'

import { Button } from '~/components/ui/Button'

interface ProjectLinkProps {
  href: string
  icon: ReactNode
  label: string
}

export function ProjectLink({ href, icon, label }: ProjectLinkProps) {
  return (
    <Button variant="solid" size="md" href={href} external leadingIcon={icon} className="min-h-11">
      {label}
    </Button>
  )
}
