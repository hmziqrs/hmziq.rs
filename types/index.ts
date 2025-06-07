// Three.js related types
export interface StarData {
  position: [number, number, number]
  size: number
  brightness: number
  color: string
  twinkleSpeed: number
}

export interface CameraPath {
  x: number
  y: number
  z: number
}

// Animation types
export interface AnimationConfig {
  duration: number
  ease: string
  delay?: number
}

export interface ScrollState {
  scrollY: number
  scrollProgress: number
  direction: 'up' | 'down'
}

// Viewport types
export interface ViewportSize {
  width: number
  height: number
}

// Performance monitoring
export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage?: number
}

// Social links
export interface SocialLink {
  name: string
  url: string
  username: string
  description: string
  icon?: string
}

// Skill categories
export interface SkillCategory {
  title: string
  skills: string[]
  description: string
  color?: string
}

// Component props
export interface SectionProps {
  className?: string
  children?: React.ReactNode
}

export interface ThreeComponentProps {
  performance?: PerformanceMetrics
  reducedMotion?: boolean
}

// Utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined

// Theme types
export interface ThemeColors {
  space: string
  white: string
  gray: {
    [key: number]: string
  }
  dark: {
    [key: number]: string
  }
  star: {
    blue: string
    purple: string
  }
}