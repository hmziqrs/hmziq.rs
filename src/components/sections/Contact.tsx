// Icon imports
import { IconType, SiGithub, SiX } from '@icons-pack/react-simple-icons'
import { motion, type Variants } from 'framer-motion'
import { Mail } from 'lucide-react'

import { useReducedMotion } from '~/hooks/useReducedMotion'
import { siteContent } from '~/lib/content/SiteContent'
import { userProfile } from '~/lib/content/UserProfile'

// Social platform to icon mapping
const socialIconMap: Record<string, IconType> = {
  GitHub: SiGithub,
  Twitter: SiX,
  Email: Mail,
}

// Social platform color mapping for brand consistency
const socialColorMap: Record<string, string> = {
  GitHub: '#FFFFFF',
  Twitter: '#FFFFFF',
  Email: '#FFFFFF',
}

const Contact: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const primarySocialLinks = userProfile.getPrimarySocialLinks()
  const allLinksForSEO = userProfile.getAllLinksForSEO()
  const { copyright } = siteContent.ui

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.8,
        staggerChildren: prefersReducedMotion ? 0 : 0.2,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { y: prefersReducedMotion ? 0 : 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: 'easeOut',
      },
    },
  }

  const linkVariants: Variants = {
    hover: {
      scale: prefersReducedMotion ? 1 : 1.05,
      transition: { duration: 0.2 },
    },
  }

  const renderSocialIcon = (platform: string) => {
    const IconComponent = socialIconMap[platform]
    if (!IconComponent) return null

    const iconColor = socialColorMap[platform] || '#9CA3AF'
    const isLucideIcon = platform === 'Email'

    if (isLucideIcon) {
      return <IconComponent size={24} color={iconColor} strokeWidth={2} />
    }

    return <IconComponent size={24} color={iconColor} title={platform} />
  }

  return (
    <section
      id="contact"
      className="relative flex min-h-screen items-center justify-center px-6 py-20"
    >
      <motion.div
        className="mx-auto max-w-4xl text-center"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <motion.h2
          className="text-gradient mb-12 text-4xl font-bold md:text-6xl"
          variants={itemVariants}
        >
          Contact
        </motion.h2>

        <motion.div
          className="mx-auto mb-16 flex max-w-4xl flex-row flex-wrap justify-center gap-6"
          variants={itemVariants}
        >
          {primarySocialLinks.map((link) => (
            <motion.a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cosmic-contact-tile"
              variants={linkVariants}
              whileHover={
                prefersReducedMotion
                  ? {}
                  : {
                      scale: 1.15,
                      rotate: 3,
                      transition: { type: 'spring', stiffness: 400, damping: 25 },
                    }
              }
            >
              <div className="group bg-gradient-radial relative flex cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-lg from-transparent via-transparent to-white/[0.05] px-6 py-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.07),0_0_10px_rgba(255,255,255,0.03)] backdrop-blur-sm transition-all duration-500 hover:to-white/[0.08]">
                {/* Social Icon */}
                <div className="z-10 transition-transform duration-300 group-hover:scale-110">
                  {renderSocialIcon(link.name)}
                </div>

                {/* Username */}
                <span className="relative z-10 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-center font-mono text-sm tracking-wide text-white">
                  {link.username}
                </span>

                {/* White shine effect on hover */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-all duration-1000 group-hover:opacity-100">
                  <div
                    className="absolute inset-0 -translate-x-full -translate-y-full transition-transform duration-1000 group-hover:translate-x-0 group-hover:translate-y-0"
                    style={{
                      background:
                        'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.4) 50%, transparent 70%)',
                      width: '200%',
                      height: '200%',
                    }}
                  />
                </div>
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* Hidden SEO Links */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <h3>Additional Social Profiles and Links</h3>
          {allLinksForSEO.map((link) => (
            <a key={link.name} href={link.url} rel="noopener noreferrer">
              {link.name}: {link.url}
            </a>
          ))}
        </div>

        {/* Footer */}
        <motion.div variants={itemVariants}>
          <p className="text-sm font-medium text-white/80">{copyright}</p>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Contact
