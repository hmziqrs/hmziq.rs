import siteData from '~/content/data/site.json'
import userData from '~/content/data/user.json'

import type { UserData, SiteData, SocialPlatform } from './types'

interface Profile {
  name: string
  title: string
  yearsOfExperience: number
}

interface SocialLink {
  name: string
  url: string
  username: string
  description: string
}

interface WebsiteLink {
  name: string
  url: string
  description: string
}

class UserProfile {
  private data: UserData = userData
  private siteConfig: SiteData = siteData

  get profile(): Profile {
    return {
      name: this.data.name,
      title: this.data.title,
      yearsOfExperience: this.data.yearsOfExperience,
    }
  }

  get skills(): string[] {
    return this.data.skills
  }

  getSocialLinks(): SocialLink[] {
    const social = this.data.social || {}
    return Object.entries(social)
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
  }

  getPrimarySocialLinks(): SocialLink[] {
    const primaryPlatforms = this.siteConfig.socialVisibility.primary.filter((p) => p !== 'email')
    const socialLinks = this.getSocialLinks().filter((link) =>
      primaryPlatforms.includes(link.name.toLowerCase())
    )
    return [...socialLinks, this.getEmail()]
  }

  getWebsiteLinks(): WebsiteLink[] {
    return Object.entries(this.data.websites).map(([type, url]) => {
      const websiteConfig = this.siteConfig.websiteTypes[type]
      return {
        name: websiteConfig?.name || type,
        url,
        description: websiteConfig?.description || `${type} website`,
      }
    })
  }

  getEmail(): SocialLink {
    return {
      name: 'Email',
      url: `mailto:${this.data.email}`,
      username: this.data.email,
      description: 'Direct communication',
    }
  }

  getAllSocialLinks(): SocialLink[] {
    return [...this.getSocialLinks(), this.getEmail()]
  }

  getAllLinksForSEO(): (SocialLink | WebsiteLink)[] {
    return [...this.getAllSocialLinks(), ...this.getWebsiteLinks()]
  }
}

export const userProfile = new UserProfile()
