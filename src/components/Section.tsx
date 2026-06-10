import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

import { useSectionVariants } from '~/hooks/useSectionVariants'

const SECTION_DEFAULTS = {
  containerDuration: 0.8,
  staggerChildren: 0.1,
  itemDuration: 0.4,
  itemY: 20,
  ease: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
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
  const { containerVariants, itemVariants } = useSectionVariants(SECTION_DEFAULTS)
  const label = ariaLabel || heading

  return (
    <section id={id} aria-label={label} className={className}>
      <motion.div
        className={`mx-auto w-full max-w-6xl ${containerClassName}`}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        {heading && (
          <motion.h2
            variants={itemVariants}
            className="mb-10 text-center font-mono text-lg font-semibold tracking-wider text-white/80"
          >
            {heading}
          </motion.h2>
        )}
        {children}
      </motion.div>
    </section>
  )
}

export { SECTION_DEFAULTS }
