import { SiRust, SiTanstack, SiThreedotjs } from '@icons-pack/react-simple-icons'

import { Button } from '~/components/ui/Button'
import { SocialLinks } from '~/components/ui/SocialLinks'
import siteData from '~/content/data/site.json'
import userData from '~/content/data/user.json'
import { useReducedMotion } from '~/hooks/useReducedMotion'

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
  const prefersReducedMotion = useReducedMotion()

  return (
    <footer className="px-6 py-10">
      <div className="max-w-page mx-auto flex w-full flex-col items-center gap-6">
        {/* Row 1 — contact */}
        <SocialLinks prefersReducedMotion={prefersReducedMotion} />

        {/* Row 2 — back to top */}
        <Button variant="link" size="sm" to="/">
          Back to top
        </Button>

        {/* Row 3 — tech credits + copyright */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className="text-fg-secondary text-sm font-medium">{copyright}</span>
          <span className="text-fg-faint" aria-hidden="true">
            ·
          </span>
          {techLinks.map((tech, i) => (
            <span key={tech.name} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-fg-faint" aria-hidden="true">
                  ·
                </span>
              )}
              <a
                href={tech.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-meta hover:text-fg-link focus-visible:text-fg-link flex items-center gap-1.5 font-mono text-xs transition-colors"
              >
                {tech.icon}
                {tech.name}
              </a>
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}
