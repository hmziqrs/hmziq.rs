import siteData from '~/content/data/site.json'
import userData from '~/content/data/user.json'

import type { SiteData, UserData } from './types'

interface UIConfig {
  copyright: string
  scrollText: string
  backToTop: string
  connectMessage: string
  additionalSkillsInfo: string
}

class SiteContent {
  private siteConfig: SiteData = siteData
  private userData: UserData = userData

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
}

export const siteContent = new SiteContent()
