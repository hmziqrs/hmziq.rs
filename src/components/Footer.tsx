import { SiRust, SiTanstack, SiThreedotjs } from '@icons-pack/react-simple-icons'

import { siteContent } from '~/lib/content/SiteContent'

export default function Footer() {
  const { copyright } = siteContent.ui

  return (
    <footer className="px-6 py-8">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-white/80">{copyright}</span>
        <span className="text-white/40" aria-hidden="true">·</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-white/60">
          <SiTanstack size={14} color="#FFFFFF" aria-hidden="true" />
          TanStack Start
        </span>
        <span className="text-white/40" aria-hidden="true">·</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-white/60">
          <SiRust size={14} color="#FFFFFF" aria-hidden="true" />
          Rust + WASM
        </span>
        <span className="text-white/40" aria-hidden="true">·</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-white/60">
          <SiThreedotjs size={14} color="#FFFFFF" aria-hidden="true" />
          Three.js
        </span>
      </div>

    </footer>
  )
}
