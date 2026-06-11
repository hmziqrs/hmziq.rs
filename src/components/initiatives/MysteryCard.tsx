import { GlassCard } from '~/components/ui/GlassCard'
import { useReducedMotion } from '~/hooks/useReducedMotion'

export function MysteryCard() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <li className="h-full" aria-label="Unannounced initiative — coming soon">
      <GlassCard className="flex h-full flex-col items-center justify-center gap-3 px-6 py-5">
        <span
          className="font-mono text-3xl font-bold text-white/25"
          aria-hidden="true"
          style={{
            animation: prefersReducedMotion ? 'none' : 'pulseOpacity 3s ease-in-out infinite',
          }}
        >
          ?
        </span>
        <p className="text-center text-xs text-white/55 italic">Something is brewing...</p>
        <span
          className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 font-mono text-[10px] font-medium text-amber-400/80"
          aria-label="Status: Coming Soon"
        >
          Coming Soon
        </span>
      </GlassCard>
    </li>
  )
}
