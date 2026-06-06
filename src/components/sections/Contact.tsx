import { IconType, SiGithub, SiRust, SiX } from '@icons-pack/react-simple-icons'
import { motion, type Variants } from 'framer-motion'
import { Box, Mail } from 'lucide-react'

import { GlowTile } from '~/components/GlowTile'
import { useSectionVariants } from '~/hooks/useSectionVariants'
import { siteContent } from '~/lib/content/SiteContent'
import { userProfile } from '~/lib/content/UserProfile'

const socialIconMap: Record<string, IconType> = {
  GitHub: SiGithub,
  Twitter: SiX,
  Email: Mail,
}

const SOCIAL_ICON_COLOR = '#FFFFFF'

function SocialIcon({ platform }: { platform: string }) {
  const IconComponent = socialIconMap[platform]
  if (!IconComponent) return null

  if (platform === 'Email') {
    return <IconComponent size={24} color={SOCIAL_ICON_COLOR} strokeWidth={2} />
  }

  return <IconComponent size={24} color={SOCIAL_ICON_COLOR} title={platform} />
}

export default function Contact() {
  const { containerVariants, itemVariants, prefersReducedMotion } = useSectionVariants()
  const primarySocialLinks = userProfile.getPrimarySocialLinks()
  const allLinksForSEO = userProfile.getAllLinksForSEO()
  const { copyright } = siteContent.ui

  const linkVariants: Variants = {
    hover: {
      scale: prefersReducedMotion ? 1 : 1.05,
      transition: { duration: 0.2 },
    },
  }

  return (
    <section
      id="contact"
      aria-label="Contact"
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
            <GlowTile
              key={link.name}
              icon={<SocialIcon platform={link.name} />}
              label={link.username}
              direction="col"
              href={link.url}
              ariaLabel={`${link.name}: ${link.username}`}
              variants={linkVariants}
              prefersReducedMotion={prefersReducedMotion}
            />
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

        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
        >
          <span className="text-sm font-medium text-white/80">{copyright}</span>
          <span className="text-white/30">·</span>
          <span className="font-mono text-xs text-white/50">TanStack Start</span>
          <span className="text-white/30">·</span>
          <span className="flex items-center gap-1.5 font-mono text-xs text-white/50">
            <SiRust size={14} color="#FFFFFF" />
            Rust + WASM
          </span>
          <span className="text-white/30">·</span>
          <span className="flex items-center gap-1.5 font-mono text-xs text-white/50">
            <Box size={14} />
            Three.js
          </span>
        </motion.div>
      </motion.div>
    </section>
  )
}
