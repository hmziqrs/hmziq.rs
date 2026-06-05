import siteData from '~/content/data/site.json'
import userData from '~/content/data/user.json'

import type { SiteData, UserData } from './types'

interface UIConfig {
  copyright: string
  scrollText: string
}

class SiteContent {
  private siteConfig: SiteData = siteData
  private userData: UserData = userData
  private _ui: UIConfig | null = null

  get ui(): UIConfig {
    if (!this._ui) {
      this._ui = {
        ...this.siteConfig.ui,
        copyright: this.siteConfig.ui.copyright.replace('{name}', this.userData.name),
        scrollText: 'Scroll to explore',
      }
    }
    return this._ui
  }
}

export const siteContent = new SiteContent()
