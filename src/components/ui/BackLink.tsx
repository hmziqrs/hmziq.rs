import { ArrowLeft } from 'lucide-react'

import { Button } from '~/components/ui/Button'

interface BackLinkProps {
  to: string
  children?: React.ReactNode
  className?: string
}

export function BackLink({ to, children = 'Back', className = '' }: BackLinkProps) {
  return (
    <Button
      variant="link"
      size="md"
      to={to}
      leadingIcon={<ArrowLeft size={14} />}
      className={className}
    >
      {children}
    </Button>
  )
}
