import { SocialIcon } from '~/lib/socialIcons'

export interface SocialLinkData {
  name: string
  url: string
  username: string
  description: string
}

interface SocialLinksProps {
  links: SocialLinkData[]
  prefersReducedMotion: boolean
}

export function SocialLinks({ links, prefersReducedMotion }: SocialLinksProps) {
  return (
    <ul className="flex list-none flex-wrap items-center justify-center gap-3">
      {links.map((link) => (
        <li key={link.name}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.name}: ${link.username} — ${link.description}`}
            className={`group relative flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-white/60 backdrop-blur-md transition-colors duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:border-white/20 focus-visible:bg-white/10 focus-visible:text-white${prefersReducedMotion ? '' : ' transition-transform hover:-translate-y-0.5'}`}
          >
            <SocialIcon platform={link.name} />
            <span className="text-sm text-white/80">{link.username}</span>
            <span className="sr-only"> (opens in new tab)</span>
            <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
              {link.description}
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
