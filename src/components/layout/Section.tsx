import { type ReactNode } from 'react'

import { useInView } from '~/hooks/useInView'

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
