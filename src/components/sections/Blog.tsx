import { motion } from 'framer-motion'

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
  const { containerVariants, itemVariants } = useSectionVariants({
    containerDuration: 0.8,
    staggerChildren: 0.1,
    itemDuration: 0.4,
    itemY: 20,
    ease: [0.25, 0.1, 0.25, 1.0],
  })

  return (
    <section
      id="blog"
      className="relative flex items-center justify-center px-6 py-20"
      aria-label="Blog"
    >
      <motion.div
        className="mx-auto w-full max-w-6xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <motion.h2
          variants={itemVariants}
          className="mb-4 text-center font-mono text-lg font-semibold tracking-wider text-white/80"
        >
          Blog
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="mb-10 text-center font-mono text-xs text-white/55"
        >
          Stay tuned — something is on the way.
        </motion.p>

        <ul role="list" className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <motion.li key={i} variants={itemVariants}>
              <SkeletonCard />
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </section>
  )
}
