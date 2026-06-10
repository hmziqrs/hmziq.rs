import { IconType, SiGithub, SiX } from '@icons-pack/react-simple-icons'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import { lazy } from 'react'

import { WASMCanvas } from '~/components/WASMCanvas'
import { useSectionVariants } from '~/hooks/useSectionVariants'
import { siteContent } from '~/lib/content/SiteContent'
import { userProfile } from '~/lib/content/UserProfile'

const ScatterText = lazy(() => import('~/components/three/ScatterText'))

function LinkedInIcon({
  size = 24,
  color = 'currentColor',
  title,
}: {
  size?: number
  color?: string
  title?: string
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      aria-hidden={!title}
      {...(title ? { 'aria-label': title } : {})}
    >
      {title && <title>{title}</title>}
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

const socialIconMap: Record<string, IconType> = {
  GitHub: SiGithub,
  LinkedIn: LinkedInIcon as unknown as IconType,
  Twitter: SiX,
  Email: Mail,
}

function SocialIcon({ platform }: { platform: string }) {
  const IconComponent = socialIconMap[platform]
  if (!IconComponent) return null

  if (platform === 'Email') {
    return <IconComponent size={14} color="currentColor" strokeWidth={2} aria-hidden="true" />
  }

  return <IconComponent size={14} color="currentColor" aria-hidden="true" />
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
      tabIndex={-1}
      aria-label="Introduction"
      className="relative block min-h-screen w-full px-6"
    >
      <h1 className="sr-only">
        {name} — {title}
      </h1>
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
        <motion.ul
          className="flex list-none flex-wrap items-center justify-center gap-3"
          variants={itemVariants}
        >
          {primarySocialLinks.map((link) => (
            <li key={link.name}>
              <motion.a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${link.name}: ${link.username}`}
                whileHover={prefersReducedMotion ? {} : { y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="group relative flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 backdrop-blur-md transition-colors duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:border-white/20 focus-visible:bg-white/10 focus-visible:text-white"
              >
                <SocialIcon platform={link.name} />
                <span className="text-sm text-white/80">{link.username}</span>
                <span className="sr-only"> (opens in new tab)</span>
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
                  {link.description}
                </span>
              </motion.a>
            </li>
          ))}
        </motion.ul>

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
