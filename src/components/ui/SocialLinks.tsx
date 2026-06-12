import siteData from '~/content/data/site.json'
import userData from '~/content/data/user.json'

import { SocialIcon } from './SocialIcon'

interface SocialLink {
  name: string
  url: string
  username: string
  description: string
}

interface SocialLinksProps {
  prefersReducedMotion: boolean
}

const primaryPlatforms = new Set(siteData.socialVisibility.primary)
const links: SocialLink[] = [
  ...Object.entries(userData.social).flatMap(([platform, username]) => {
    if (!primaryPlatforms.has(platform)) return []

    const config = siteData.socialPlatforms[platform as keyof typeof siteData.socialPlatforms]
    if (!config) return []

    const actualUsername = username ?? userData.username
    const prefix = 'usernamePrefix' in config ? config.usernamePrefix : ''
    return [
      {
        name: config.name,
        url: `${config.baseUrl}${actualUsername}`,
        username: `${prefix}${actualUsername}`,
        description: config.description,
      },
    ]
  }),
  {
    name: 'Email',
    url: `mailto:${userData.email}`,
    username: userData.email,
    description: 'Direct communication',
  },
]

export function SocialLinks({ prefersReducedMotion }: SocialLinksProps) {
  return (
    <ul className="flex list-none flex-wrap items-center justify-center gap-3">
      {links.map((link) => (
        <li key={link.name}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.name}: ${link.username} — ${link.description}`}
            className={`group relative flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-white/60 font-mono backdrop-blur-sm transition-colors duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:border-white/20 focus-visible:bg-white/10 focus-visible:text-white${prefersReducedMotion ? '' : ' transition-transform hover:-translate-y-0.5'}`}
          >
            <SocialIcon platform={link.name} />
            <span className="text-sm text-white/80">{link.username}</span>
            <span className="sr-only"> (opens in new tab)</span>
            <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded bg-white/20 backdrop-blur-xl px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
              {link.description}
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
