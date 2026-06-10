import { motion } from 'framer-motion'

interface ScrollIndicatorProps {
  scrollText: string
  prefersReducedMotion: boolean
}

export function ScrollIndicator({ scrollText, prefersReducedMotion }: ScrollIndicatorProps) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 transform">
      <span className="sr-only">{scrollText}</span>
      <div className="flex flex-col items-center" aria-hidden="true">
        <motion.div
          className="-right-1 flex h-10 w-6 justify-center rounded-full border-2 border-gray-400"
          whileHover={prefersReducedMotion ? {} : { borderColor: '#ffffff', scale: 1.2 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="mt-2 h-3 w-1 rounded-full bg-gray-300"
            animate={
              prefersReducedMotion
                ? {}
                : {
                    y: [0, 12, 0],
                    opacity: [1, 0.3, 1],
                  }
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
        <div className="h-2" />
        <p className="text-sm tracking-widest text-gray-300">{scrollText}</p>
      </div>
    </div>
  )
}
