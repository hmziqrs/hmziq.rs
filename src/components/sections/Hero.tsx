import { IconType, SiGithub, SiX } from '@icons-pack/react-simple-icons'
import { motion } from 'framer-motion'
import { lazy } from 'react'
import { Mail } from 'lucide-react'

import { WASMCanvas } from '~/components/WASMCanvas'
import { useSectionVariants } from '~/hooks/useSectionVariants'
import { siteContent } from '~/lib/content/SiteContent'
import { userProfile } from '~/lib/content/UserProfile'

const ScatterText = lazy(() => import('~/components/three/ScatterText'))

const socialIconMap: Record<string, IconType> = {
  GitHub: SiGithub,
  Twitter: SiX,
  Email: Mail,
}

function SocialIcon({ platform }: { platform: string }) {
  const IconComponent = socialIconMap[platform]
  if (!IconComponent) return null

  if (platform === 'Email') {
    return <IconComponent size={20} color="currentColor" strokeWidth={2} />
  }

  return <IconComponent size={20} color="currentColor" title={platform} />
}

export default function Hero() {
  const { containerVariants, itemVariants, prefersReducedMotion } = useSectionVariants({
    containerDuration: 1,
    itemDuration: 0.8,
    itemY: 50,
    ease: [0.25, 0.46, 0.45, 0.94],
  })
  const { name, title } = userProfile.profile
  const { scrollText } = siteContent.ui
  const primarySocialLinks = userProfile.getPrimarySocialLinks()

  return (
    <section
      id="hero"
      aria-label="Introduction"
      className="relative block min-h-screen w-full px-6"
    >
      <motion.div
        className="flex min-h-screen w-full flex-col items-center justify-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="relative h-32 w-full">
          <WASMCanvas
            loadingFallback={
              <div className="h-32 w-full">
                <div className="text-6xl font-bold text-white md:text-7xl lg:text-8xl">{name}</div>
              </div>
            }
          >
            <ScatterText text={name} />
          </WASMCanvas>
        </div>

        <motion.p
          className="text-xl font-light text-gray-300 md:text-2xl lg:text-3xl"
          variants={itemVariants}
        >
          {title}
        </motion.p>

        <div className="h-6" />

        {/* Social links */}
        <motion.div
          className="flex items-center justify-center gap-4"
          variants={itemVariants}
        >
          {primarySocialLinks.map((link) => (
            <motion.a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${link.name}: ${link.username}`}
              whileHover={prefersReducedMotion ? {} : { scale: 1.15, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors duration-300 hover:border-white/25 hover:text-white"
            >
              <SocialIcon platform={link.name} />
            </motion.a>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 transform"
          variants={itemVariants}
        >
          <div className="flex flex-col items-center" aria-hidden="true">
            <motion.div
              className="-right-1 flex h-10 w-6 justify-center rounded-full border-2 border-gray-500"
              whileHover={{ borderColor: '#ffffff', scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="mt-2 h-3 w-1 rounded-full bg-gray-400"
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
            <p className="text-sm tracking-widest text-gray-400">{scrollText}</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
