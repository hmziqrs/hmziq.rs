'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { userProfile } from '@/lib/content/UserProfile'
import { siteContent } from '@/lib/content/SiteContent'

// Icon imports
import { SiGithub, SiX } from '@icons-pack/react-simple-icons'
import { Mail } from 'lucide-react'

// Social platform to icon mapping
const socialIconMap: Record<string, React.ComponentType<any>> = {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.8,
        staggerChildren: prefersReducedMotion ? 0 : 0.2,
      },
    },
  }

  const itemVariants = {
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

  const linkVariants = {
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
      className="relative min-h-screen flex items-center justify-center px-6 py-20"
    >
      <motion.div
        className="max-w-4xl mx-auto text-center"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <motion.h2
          className="text-4xl md:text-6xl font-bold mb-12 text-gradient"
          variants={itemVariants}
        >
          Contact
        </motion.h2>

        <motion.div
          className="flex flex-row flex-wrap justify-center gap-6 mb-16 max-w-4xl mx-auto"
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
              <div className="px-6 py-4 relative rounded-lg backdrop-blur-sm shadow-[inset_0_0_20px_rgba(255,255,255,0.07),0_0_10px_rgba(255,255,255,0.03)] transition-all duration-500 group cursor-pointer flex flex-col items-center gap-3 overflow-hidden bg-gradient-radial from-transparent via-transparent to-white/[0.05] hover:to-white/[0.08]">
                {/* Social Icon */}
                <div className="transition-transform duration-300 group-hover:scale-110 z-10">
                  {renderSocialIcon(link.name)}
                </div>

                {/* Username */}
                <span className="relative z-10 text-white font-mono text-sm tracking-wide text-center bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  {link.username}
                </span>

                {/* White shine effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none">
                  <div
                    className="absolute inset-0 -translate-x-full -translate-y-full group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-1000"
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
