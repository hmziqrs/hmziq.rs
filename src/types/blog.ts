export interface BlogPostCover {
  src: string
  width: number
  height: number
}

export interface BlogPostSummary {
  id: string
  title: string
  description: string
  date: string
  updated: string | null
  category: string
  tags: string[]
  cover: BlogPostCover | null
  cover_alt: string | null
}
