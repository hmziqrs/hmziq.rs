import siteData from '~/content/data/site.json'
import userData from '~/content/data/user.json'

interface UIConfig {
  copyright: string
  scrollText: string
  backToTop: string
  connectMessage: string
  additionalSkillsInfo: string
}

interface Navigation {
  sections: string[]
}

class SiteContent {
  private siteConfig = siteData
  private userData = userData

  get ui(): UIConfig {
    return {
      ...this.siteConfig.ui,
      copyright: this.siteConfig.ui.copyright.replace('{name}', this.userData.name),
      scrollText: 'Scroll to explore',
      backToTop: 'Back to Top',
      connectMessage: "Let's connect and build something amazing together",
      additionalSkillsInfo: 'Additional skills',
    }
  }

  get navigation(): Navigation {
    return this.siteConfig.navigation
  }

  get socialPlatforms() {
    return this.siteConfig.socialPlatforms
  }
}

export const siteContent = new SiteContent()
