import userData from '@/content/data/user.json'
import siteData from '@/content/data/site.json'

export interface Profile {
  name: string
  title: string
  yearsOfExperience: number
}

export interface About {
  paragraphs: string[]
  stats: Array<{
    value: string
    label: string
  }>
}

export interface SkillCategory {
  title: string
  skills: string[]
}

export interface SocialLink {
  name: string
  url: string
  username: string
  description: string
}

export interface WebsiteLink {
  name: string
  url: string
  description: string
}

export class UserProfile {
  private data = userData
  private siteConfig = siteData

  get profile(): Profile {
    return {
      name: this.data.name,
      title: this.data.title,
      yearsOfExperience: this.data.yearsOfExperience,
    }
  }

  get skills(): string[] {
    return this.data.skills as string[]
  }

  getSocialLinks(): SocialLink[] {
    const social = this.data.social || {}
    return Object.entries(social)
      .map(([platform, username]) => {
        const platformConfig =
          this.siteConfig.socialPlatforms[platform as keyof typeof this.siteConfig.socialPlatforms]
        if (!platformConfig) return null

        // Use default username if null, otherwise use provided username
        const actualUsername = username || this.data.username

        return {
          name: platformConfig.name,
          url: `${platformConfig.baseUrl}${actualUsername}`,
          username: `${'usernamePrefix' in platformConfig ? platformConfig.usernamePrefix || '' : ''}${actualUsername}`,
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

  getHiddenSocialLinks(): SocialLink[] {
    const hiddenPlatforms = this.siteConfig.socialVisibility.hidden
    return this.getSocialLinks().filter((link) => hiddenPlatforms.includes(link.name.toLowerCase()))
  }

  getWebsiteLinks(): WebsiteLink[] {
    return Object.entries(this.data.websites).map(([type, url]) => {
      const websiteConfig =
        this.siteConfig.websiteTypes[type as keyof typeof this.siteConfig.websiteTypes]
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

// Export singleton instance
export const userProfile = new UserProfile()
