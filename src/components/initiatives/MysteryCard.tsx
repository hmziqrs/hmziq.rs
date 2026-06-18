import { Card } from '~/components/ui/Card'
import { Tag } from '~/components/ui/Tag'
import { useReducedMotion } from '~/hooks/useReducedMotion'

export function MysteryCard() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <li className="h-full" aria-label="Unannounced initiative — coming soon">
      <Card
        variant="glass"
        interactive
        className="flex h-full flex-col items-center justify-center gap-3 px-6 py-5"
      >
        <span
          className="text-fg-faint font-mono text-3xl font-bold"
          aria-hidden="true"
          style={{
            animation: prefersReducedMotion ? 'none' : 'pulseOpacity 3s ease-in-out infinite',
          }}
        >
          ?
        </span>
        <p className="text-fg-secondary text-center text-xs italic">Something is brewing...</p>
        <Tag variant="status" status="pending" size="xs" aria-label="Status: Coming Soon">
          Coming Soon
        </Tag>
      </Card>
    </li>
  )
}
