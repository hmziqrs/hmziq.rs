import siteData from '@/content/data/site.json'
import userData from '@/content/data/user.json'

export interface UIConfig {
  copyright: string
  scrollText: string
  backToTop: string
  connectMessage: string
  additionalSkillsInfo: string
}

export interface Navigation {
  sections: string[]
}

export class SiteContent {
  private siteConfig = siteData
  private userData = userData

  get ui(): UIConfig {
    // Replace placeholders with actual data
    return {
      ...this.siteConfig.ui,
      copyright: this.siteConfig.ui.copyright.replace('{name}', this.userData.name)
    }
  }

  get navigation(): Navigation {
    return this.siteConfig.navigation
  }

  get skillCategoryDescriptions() {
    return this.siteConfig.skillCategories
  }

  get socialPlatforms() {
    return this.siteConfig.socialPlatforms
  }
}

// Export singleton instance
export const siteContent = new SiteContent()