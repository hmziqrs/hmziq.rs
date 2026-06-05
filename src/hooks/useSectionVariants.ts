import { type Easing, type Variants } from 'framer-motion'

import { useReducedMotion } from './useReducedMotion'

interface SectionVariantsConfig {
  containerDuration?: number
  staggerChildren?: number
  itemDuration?: number
  itemY?: number
  ease?: Easing
}

export function useSectionVariants(config: SectionVariantsConfig = {}) {
  const prefersReducedMotion = useReducedMotion()
  const {
    containerDuration = 0.8,
    staggerChildren = 0.2,
    itemDuration = 0.6,
    itemY = 30,
    ease = 'easeOut',
  } = config

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : containerDuration,
        staggerChildren: prefersReducedMotion ? 0 : staggerChildren,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { y: prefersReducedMotion ? 0 : itemY, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: prefersReducedMotion ? 0 : itemDuration, ease },
    },
  }

  return { containerVariants, itemVariants, prefersReducedMotion }
}
