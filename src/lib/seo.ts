import userData from '~/content/data/user.json'

const siteUrl = userData.websites.portfolio
const homeTitle = `${userData.name} - ${userData.title}`
const homeDescription = `Personal landing page of ${userData.name} - ${userData.title} with ${userData.yearsOfExperience} years of experience in full-stack development, TypeScript, React, and modern web technologies.`

export { homeDescription, homeTitle, siteUrl }

export interface PageSeoInput {
  /** Route path with a leading slash (e.g. '/projects/gpui-query'). '' for home. */
  path: string
  /** Full document <title>. */
  title: string
  /** Meta description + og:description. */
  description: string
  /** og:type. Defaults to 'website'; use 'article' for detail pages. */
  type?: 'website' | 'article'
}

/**
 * head() content for a content route: per-page OG overrides + a canonical link.
 *
 * The root route supplies homepage defaults for og:* / twitter:* / description.
 * TanStack Router merges meta child-first by `name ?? property`, so the entries
 * returned here override the root's without duplicating them. Canonical lives
 * ONLY here: link tags dedupe by full-object equality (JSON.stringify), so a
 * root canonical (home URL) plus this one (page URL) would render two
 * `<link rel="canonical">` tags. The root therefore emits no canonical — every
 * page gets exactly one, from its own route.
 */
export function pageHead({ path, title, description, type = 'website' }: PageSeoInput) {
  const url = `${siteUrl}${path}`
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
    links: [{ rel: 'canonical', href: url }],
  }
}
