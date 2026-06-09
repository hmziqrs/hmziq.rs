import { SiRust } from '@icons-pack/react-simple-icons'
import { Box } from 'lucide-react'

import { siteContent } from '~/lib/content/SiteContent'
import { userProfile } from '~/lib/content/UserProfile'

export default function Footer() {
  const { copyright } = siteContent.ui
  const allLinksForSEO = userProfile.getAllLinksForSEO()

  return (
    <footer className="px-6 py-8">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-white/80">{copyright}</span>
        <span className="text-white/40">·</span>
        <span className="font-mono text-xs text-white/60">TanStack Start</span>
        <span className="text-white/40">·</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-white/60">
          <SiRust size={14} color="#FFFFFF" />
          Rust + WASM
        </span>
        <span className="text-white/40">·</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-white/60">
          <Box size={14} />
          Three.js
        </span>
      </div>

      {/* Hidden SEO Links */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <h3>Additional Social Profiles and Links</h3>
        {allLinksForSEO.map((link) => (
          <a key={link.name} href={link.url} rel="noopener noreferrer">
            {link.name}: {link.url}
          </a>
        ))}
      </div>
    </footer>
  )
}
