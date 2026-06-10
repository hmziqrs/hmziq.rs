import {
  SiAdonisjs,
  SiAngular,
  SiAstro,
  SiBun,
  SiCloudflareworkers,
  SiCss,
  SiDart,
  SiDocker,
  SiDrizzle,
  SiDropbox,
  SiElasticsearch,
  SiEthereum,
  SiEthers,
  SiExpo,
  SiExpress,
  SiFirebase,
  SiFlutter,
  SiFramer,
  SiGo,
  SiHono,
  SiGithubactions,
  SiGoogledrive,
  SiHtml5,
  SiIced,
  SiJavascript,
  SiJest,
  SiJetpackcompose,
  SiKotlin,
  SiMaterialdesignicons,
  SiMongodb,
  SiMysql,
  SiNextdotjs,
  SiNodedotjs,

  SiPolygon,
  SiPostgresql,
  SiPuppeteer,
  SiPython,
  SiReact,
  SiRedux,
  SiReduxsaga,
  SiRust,
  SiSocketdotio,
  SiSqlite,
  SiStyledcomponents,
  SiSvelte,
  SiSwift,
  SiTailwindcss,

  SiThreedotjs,
  SiTypescript,
  SiVuedotjs,
  SiWebassembly,
  SiWebpack,
  SiWordpress,
  SiYoutube,
  type IconType,
} from '@icons-pack/react-simple-icons'

export interface TechIconEntry {
  icon?: IconType
  color: string
  abbr?: string
  showInSkills?: boolean
}

// Map tech names to brand icons + colors.
// Technologies without a brand icon get an `abbr` fallback.
export const techIconMap: Record<string, TechIconEntry> = {
  // Languages
  TypeScript: { icon: SiTypescript, color: '#3178C6' },
  JavaScript: { icon: SiJavascript, color: '#F7DF1E' },
  Rust: { icon: SiRust, color: '#CE422B' },
  Dart: { icon: SiDart, color: '#0175C2' },
  Kotlin: { icon: SiKotlin, color: '#7F52FF' },
  Swift: { icon: SiSwift, color: '#F05138' },
  Go: { icon: SiGo, color: '#00ADD8' },
  'C++': { color: '#00599C', abbr: 'C+' },
  CSS: { icon: SiCss, color: '#1572B6' },
  HTML: { icon: SiHtml5, color: '#E34F26' },
  Shell: { color: '#4EAA25', abbr: '$_' },
  Python: { icon: SiPython, color: '#3776AB' },

  // Frameworks & Libraries
  React: { icon: SiReact, color: '#61DAFB', showInSkills: true },
  'React Native': { icon: SiReact, color: '#61DAFB', showInSkills: true },
  'React Three Fiber': { icon: SiThreedotjs, color: '#049EF4' },
  'Next.JS': { icon: SiNextdotjs, color: '#FFFFFF', showInSkills: true },
  'Next.js': { icon: SiNextdotjs, color: '#FFFFFF' },
  Angular: { icon: SiAngular, color: '#DD0031' },
  AngularJS: { icon: SiAngular, color: '#DD0031' },
  'Vue.js': { icon: SiVuedotjs, color: '#4FC08D' },
  Svelte: { icon: SiSvelte, color: '#FF3E00' },
  SvelteKit: { icon: SiSvelte, color: '#FF3E00' },
  Astro: { icon: SiAstro, color: '#FF5D01' },
  Flutter: { icon: SiFlutter, color: '#02569B', showInSkills: true },
  SwiftUI: { icon: SiSwift, color: '#F05138' },
  'Jetpack Compose': { icon: SiJetpackcompose, color: '#4285F4' },
  Expo: { icon: SiExpo, color: '#000000' },
  ExpressJS: { icon: SiExpress, color: '#000000' },
  AdonisJS: { icon: SiAdonisjs, color: '#5A45FF', showInSkills: true },
  Dioxus: { icon: SiRust, color: '#CE422B', showInSkills: true },
  Axum: { icon: SiRust, color: '#CE422B', showInSkills: true },
  'Dioxus Router': { icon: SiRust, color: '#CE422B' },
  'Dioxus SSG': { icon: SiRust, color: '#CE422B' },
  'Dioxus Web': { icon: SiRust, color: '#CE422B' },
  Iced: { icon: SiIced, color: '#3C82D1' },
  Redux: { icon: SiRedux, color: '#764ABC' },
  'Redux-Saga': { icon: SiReduxsaga, color: '#999999' },
  'Framer Motion': { icon: SiFramer, color: '#0055FF' },
  'styled-components': { icon: SiStyledcomponents, color: '#DB7093' },
  'Material UI': { icon: SiMaterialdesignicons, color: '#0081CB' },
  'Tailwind CSS': { icon: SiTailwindcss, color: '#06B6D4' },
  'Three.js': { icon: SiThreedotjs, color: '#049EF4' },
  Zustand: { color: '#3B82F6', abbr: 'Zu' },
  'Immutable.js': { color: '#3C3C3C', abbr: 'Im' },
  'better-auth': { color: '#000000', abbr: 'BA' },
  Provider: { color: '#6B7280', abbr: 'Pr' },
  GPUI: { color: '#8B5CF6', abbr: 'GP' },
  egui: { color: '#6B7280', abbr: 'eg' },
  Bloc: { color: '#00B4D8', abbr: 'Bl' },
  Elasticsearch: { icon: SiElasticsearch, color: '#005571' },
  Polygon: { icon: SiPolygon, color: '#7B3FE4' },
  HonoJS: { icon: SiHono, color: '#E36002', showInSkills: true },

  // Runtime & Build
  Bun: { icon: SiBun, color: '#FBF0DF' },
  'Node.js': { icon: SiNodedotjs, color: '#339933' },
  Webpack: { icon: SiWebpack, color: '#8DD6F9' },
  WASM: { icon: SiWebassembly, color: '#654FF0' },
  WebAssembly: { icon: SiWebassembly, color: '#654FF0' },

  // Database & ORM
  PostgreSQL: { icon: SiPostgresql, color: '#4169E1' },
  MySQL: { icon: SiMysql, color: '#4479A1' },
  MongoDB: { icon: SiMongodb, color: '#47A248' },
  SQLite: { icon: SiSqlite, color: '#003B57' },
  'Drizzle ORM': { icon: SiDrizzle, color: '#C5F74E' },
  D1: { color: '#F38020', abbr: 'D1' },

  // Cloud & Infrastructure
  Docker: { icon: SiDocker, color: '#2496ED', showInSkills: true },
  Firebase: { icon: SiFirebase, color: '#FFCA28' },
  AWS: { color: '#FF9900', abbr: 'AW' },
  'Cloudflare Workers': { icon: SiCloudflareworkers, color: '#F48120' },
  'GitHub Actions': { icon: SiGithubactions, color: '#2088FF' },

  // APIs & Services
  'Dropbox API': { icon: SiDropbox, color: '#0061FF' },
  'Google Drive API': { icon: SiGoogledrive, color: '#4285F4' },
  'WordPress API': { icon: SiWordpress, color: '#21759B' },
  'YouTube API': { icon: SiYoutube, color: '#FF0000' },
  'Socket.IO': { icon: SiSocketdotio, color: '#010101' },
  Puppeteer: { icon: SiPuppeteer, color: '#40B5A4' },
  Jest: { icon: SiJest, color: '#C21325' },
  syntect: { icon: SiRust, color: '#CE422B' },

  // Blockchain & Web3
  Ethereum: { icon: SiEthereum, color: '#3C3C3D' },
  Ethers: { icon: SiEthers, color: '#2B2B2B' },
  'Ethers.js': { icon: SiEthers, color: '#2B2B2B' },
  Web3: { color: '#F16822', abbr: 'W3' },

  // General skills
  'CI/CD': { color: '#10B981', abbr: 'CI', showInSkills: true },
  Architecture: { color: '#8B5CF6', abbr: 'Ar', showInSkills: true },
  Animations: { color: '#F59E0B', abbr: 'An', showInSkills: true },
}

export function getTechIcon(tech: string): TechIconEntry {
  return techIconMap[tech] ?? { color: '#6B7280', abbr: tech.slice(0, 2).toUpperCase() }
}
