export interface UserData {
  username: string
  name: string
  title: string
  yearsOfExperience: number
  email: string
  skills: string[]
  websites: Record<string, string>
  social: Record<string, string | null>
}

export interface SocialPlatform {
  name: string
  baseUrl: string
  description: string
  usernamePrefix?: string
}

export interface WebsiteType {
  name: string
  description: string
}

export interface SiteData {
  socialPlatforms: Record<string, SocialPlatform>
  websiteTypes: Record<string, WebsiteType>
  socialVisibility: {
    primary: string[]
    hidden: string[]
  }
  ui: {
    copyright: string
  }
}
