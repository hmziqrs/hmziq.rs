import type { Metadata, Viewport } from 'next'
import userData from '@/content/data/user.json'
import siteData from '@/content/data/site.json'
import metadataData from '@/content/data/metadata.json'

export class MetadataConfig {
  private userData = userData
  private siteData = siteData
  private metadataData = metadataData

  getMetadata(): Metadata {
    const title = `${this.userData.name} - ${this.userData.title}`
    const description = `Personal landing page of ${this.userData.name} - ${this.userData.title} with ${this.userData.yearsOfExperience} years of experience in full-stack development, TypeScript, React, and modern web technologies.`
    const siteUrl = this.userData.websites.portfolio
    const twitterUsername = this.userData.username // Using username for Twitter handle

    return {
      title,
      description,
      keywords: [
        this.userData.name,
        this.userData.title,
        ...this.userData.skills,
        ...this.metadataData.seo.additionalKeywords,
      ],
      authors: [{ name: this.userData.name, url: siteUrl }],
      creator: this.userData.name,
      publisher: this.userData.name,
      metadataBase: new URL(siteUrl),
      openGraph: {
        type: this.metadataData.openGraph.type as 'website',
        locale: this.metadataData.openGraph.locale,
        url: siteUrl,
        title,
        description: `Personal landing page of ${this.userData.name} - ${this.userData.title} with ${this.userData.yearsOfExperience} years of experience in full-stack development.`,
        siteName: new URL(siteUrl).hostname,
      },
      twitter: {
        card: this.metadataData.twitter.card as 'summary_large_image',
        title,
        description: `Personal landing page of ${this.userData.name} - ${this.userData.title} with ${this.userData.yearsOfExperience} years of experience in full-stack development.`,
        creator: `@${twitterUsername}`,
      },
      robots: {
        index: this.metadataData.robots.index,
        follow: this.metadataData.robots.follow,
        googleBot: {
          index: this.metadataData.robots.googleBot.index,
          follow: this.metadataData.robots.googleBot.follow,
          'max-video-preview': this.metadataData.robots.googleBot.maxVideoPreview,
          'max-image-preview': this.metadataData.robots.googleBot.maxImagePreview,
          'max-snippet': this.metadataData.robots.googleBot.maxSnippet,
        },
      },
    }
  }

  getViewport(): Viewport {
    return {
      width: this.metadataData.viewport.width,
      initialScale: this.metadataData.viewport.initialScale,
      maximumScale: this.metadataData.viewport.maximumScale,
      themeColor: this.metadataData.theme.themeColor,
    }
  }

  get siteUrl(): string {
    return this.userData.websites.portfolio
  }

  get siteName(): string {
    return new URL(this.userData.websites.portfolio).hostname
  }

  get userName(): string {
    return this.userData.name
  }

  get userTitle(): string {
    return this.userData.title
  }
}

// Export singleton instance
export const metadataConfig = new MetadataConfig()
