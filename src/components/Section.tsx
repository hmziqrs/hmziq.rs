import { type ReactNode } from 'react'

import { useInView } from '~/hooks/useInView'
import { useReducedMotion } from '~/hooks/useReducedMotion'

const SECTION_DEFAULTS = {
  containerDuration: 0.8,
  staggerChildren: 0.1,
  itemDuration: 0.4,
  itemY: 20,
  ease: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
}

/**
 * Hook that provides prefersReducedMotion for section children.
 */
export function useSectionItemVariants() {
  const prefersReducedMotion = useReducedMotion()
  return { prefersReducedMotion }
}

interface SectionProps {
  id: string
  heading?: string
  ariaLabel?: string
  className?: string
  containerClassName?: string
  children: ReactNode
}

export function Section({
  id,
  heading,
  ariaLabel,
  className = '',
  containerClassName = '',
  children,
}: SectionProps) {
  const { ref, isInView } = useInView({ once: true, rootMargin: '-100px' })
  const label = ariaLabel || heading

  return (
    <section id={id} aria-label={label} className={className}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className={`mx-auto w-full max-w-6xl ${isInView ? 'section-visible' : 'section-invisible'} ${containerClassName}`}
      >
        {heading && (
          <h2 className="mb-10 text-center font-mono text-lg font-semibold tracking-wider text-white/80">
            {heading}
          </h2>
        )}
        {children}
      </div>
    </section>
  )
}

export { SECTION_DEFAULTS }
