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
  private _socialLinks: SocialLink[] | null = null
  private _primarySocialLinks: SocialLink[] | null = null
  private _allLinksForSEO: (SocialLink | WebsiteLink)[] | null = null

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
    if (this._socialLinks) return this._socialLinks
    const social = this.data.social || {}
    this._socialLinks = Object.entries(social)
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
    return this._socialLinks
  }

  getPrimarySocialLinks(): SocialLink[] {
    if (this._primarySocialLinks) return this._primarySocialLinks
    const primaryPlatforms = this.siteConfig.socialVisibility.primary.filter((p) => p !== 'email')
    const socialLinks = this.getSocialLinks().filter((link) =>
      primaryPlatforms.includes(link.name.toLowerCase())
    )
    this._primarySocialLinks = [...socialLinks, this.getEmail()]
    return this._primarySocialLinks
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

  private getAllSocialLinks(): SocialLink[] {
    return [...this.getSocialLinks(), this.getEmail()]
  }

  getAllLinksForSEO(): (SocialLink | WebsiteLink)[] {
    if (this._allLinksForSEO) return this._allLinksForSEO
    this._allLinksForSEO = [...this.getAllSocialLinks(), ...this.getWebsiteLinks()]
    return this._allLinksForSEO
  }
}

export const userProfile = new UserProfile()
