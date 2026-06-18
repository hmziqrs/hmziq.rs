import { Button } from '~/components/ui/Button'
import { Tooltip } from '~/components/ui/Tooltip'
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
    <nav aria-label="Social media and contact">
      <ul className="flex list-none flex-wrap items-center justify-center gap-3">
        {links.map((link) => (
          <li key={link.name}>
            <Tooltip content={link.description} side="top">
              <Button
                variant="ghost"
                size="md"
                href={link.url}
                external
                leadingIcon={<SocialIcon platform={link.name} />}
                prefersReducedMotion={prefersReducedMotion}
                aria-label={`${link.name}: ${link.username} — ${link.description}`}
                className="px-3 py-3"
              >
                <span className="text-fg-body text-sm">{link.username}</span>
              </Button>
            </Tooltip>
          </li>
        ))}
      </ul>
    </nav>
  )
}
