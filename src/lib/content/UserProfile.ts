import siteData from '~/content/data/site.json'
import userData from '~/content/data/user.json'

import type { UserData, SiteData, SocialPlatform } from './types'

interface Profile {
  name: string
  title: string
  tagline: string
  yearsOfExperience: number
}

interface SocialLink {
  name: string
  url: string
  username: string
  description: string
}

class UserProfile {
  private data: UserData = userData
  private siteConfig: SiteData = siteData
  private _primarySocialLinks: SocialLink[] | null = null

  get profile(): Profile {
    return {
      name: this.data.name,
      title: this.data.title,
      tagline: this.data.tagline,
      yearsOfExperience: this.data.yearsOfExperience,
    }
  }

  get skills(): string[] {
    return this.data.skills
  }

  getPrimarySocialLinks(): SocialLink[] {
    if (this._primarySocialLinks) return this._primarySocialLinks
    const primaryPlatforms = this.siteConfig.socialVisibility.primary.filter((p) => p !== 'email')
    const social = this.data.social || {}
    const socialLinks = Object.entries(social)
      .map(([platform, username]) => {
        const platformConfig: SocialPlatform | undefined = this.siteConfig.socialPlatforms[platform]
        if (!platformConfig) return null
        const actualUsername = username || this.data.username
        return {
          name: platformConfig.name,
          url: `${platformConfig.baseUrl}${actualUsername}`,
          username: `${platformConfig.usernamePrefix || ''}${actualUsername}`,
          description: platformConfig.description,
        }
      })
      .filter((link): link is SocialLink => link !== null)
      .filter((link) => primaryPlatforms.includes(link.name.toLowerCase()))
    this._primarySocialLinks = [
      ...socialLinks,
      {
        name: 'Email',
        url: `mailto:${this.data.email}`,
        username: this.data.email,
        description: 'Direct communication',
      },
    ]
    return this._primarySocialLinks
  }
}

export const userProfile = new UserProfile()
