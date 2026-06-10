import { motion } from 'framer-motion'

import { Section, SECTION_DEFAULTS } from '~/components/Section'
import { useSectionVariants } from '~/hooks/useSectionVariants'

function SkeletonCard() {
  return (
    <div
      className="h-full overflow-hidden border border-white/2 bg-white/3 px-6 py-5 backdrop-blur-sm"
      aria-hidden="true"
      role="presentation"
    >
      {/* Title placeholder */}
      <div className="animate-shimmer h-4 w-3/5 rounded" />
      {/* Date placeholder */}
      <div className="animate-shimmer mt-3 h-3 w-1/4 rounded" />
      {/* Description placeholders */}
      <div className="animate-shimmer mt-4 h-3 w-full rounded" />
      <div className="animate-shimmer mt-1.5 h-3 w-3/4 rounded" />
      <div className="animate-shimmer mt-1.5 h-3 w-1/2 rounded" />
    </div>
  )
}

export default function Blog() {
  const { itemVariants } = useSectionVariants(SECTION_DEFAULTS)

  return (
    <Section
      id="blog"
      heading="Blog"
      className="relative flex items-center justify-center px-6 py-20"
    >
      <motion.p
        variants={itemVariants}
        className="mb-10 text-center font-mono text-xs text-white/55"
      >
        Stay tuned — something is on the way.
      </motion.p>

      <ul  className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <motion.li key={i} variants={itemVariants}>
            <SkeletonCard />
          </motion.li>
        ))}
      </ul>
    </Section>
  )
}
