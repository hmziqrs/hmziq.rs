import { SiRust, SiTanstack, SiThreedotjs } from '@icons-pack/react-simple-icons'

import siteData from '~/content/data/site.json'
import userData from '~/content/data/user.json'

const copyright = siteData.ui.copyright.replace('{name}', userData.name)

const techLinks = [
  {
    name: 'TanStack Start',
    href: 'https://tanstack.com/start',
    icon: <SiTanstack size={14} color="#FFFFFF" aria-hidden="true" />,
  },
  {
    name: 'Rust + WASM',
    href: 'https://www.rust-lang.org/',
    icon: <SiRust size={14} color="#FFFFFF" aria-hidden="true" />,
  },
  {
    name: 'Three.js',
    href: 'https://threejs.org/',
    icon: <SiThreedotjs size={14} color="#FFFFFF" aria-hidden="true" />,
  },
]

export default function Footer() {
  return (
    <footer className="px-6 py-8">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-white/80">{copyright}</span>
        <span className="text-white/40" aria-hidden="true">·</span>
        {techLinks.map((tech, i) => (
          <span key={tech.name} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-white/40" aria-hidden="true">·</span>
            )}
            <a
              href={tech.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-xs text-white/60 transition-colors hover:text-white focus-visible:text-white"
            >
              {tech.icon}
              {tech.name}
            </a>
          </span>
        ))}
      </div>
    </footer>
  )
}
