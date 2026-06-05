import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router'

import metadataData from '~/content/data/metadata.json'
import userData from '~/content/data/user.json'
import { WASMProvider } from '~/contexts/WASMContext'
import { AnalyticsProvider } from '~/lib/analytics'

import appCss from '~/styles.css?url'

const siteUrl = userData.websites.portfolio
const title = `${userData.name} - ${userData.title}`
const description = `Personal landing page of ${userData.name} - ${userData.title} with ${userData.yearsOfExperience} years of experience in full-stack development, TypeScript, React, and modern web technologies.`

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: userData.name,
  jobTitle: userData.title,
  description: `${userData.title} with ${userData.yearsOfExperience} years of experience in full-stack development, specializing in modern web technologies.`,
  url: siteUrl,
  sameAs: [
    `https://github.com/${userData.username}`,
    `https://linkedin.com/in/${userData.username}`,
    `https://twitter.com/${userData.username}`,
  ],
  email: userData.email,
}

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: `width=${metadataData.viewport.width}, initial-scale=${metadataData.viewport.initialScale}, maximum-scale=${metadataData.viewport.maximumScale}`,
      },
      { title },
      { name: 'description', content: description },
      { name: 'theme-color', content: metadataData.theme.themeColor },
      { name: 'robots', content: 'index, follow' },
      { name: 'keywords', content: metadataData.seo.additionalKeywords.join(', ') },
      { name: 'yandex-verification', content: '2c30efbb908a334d' },
      { property: 'og:type', content: metadataData.openGraph.type },
      { property: 'og:locale', content: metadataData.openGraph.locale },
      { property: 'og:url', content: siteUrl },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: `${siteUrl}/fav/android-chrome-512x512.png` },
      { property: 'og:site_name', content: new URL(siteUrl).hostname },
      { name: 'twitter:card', content: metadataData.twitter.card },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: `${siteUrl}/fav/android-chrome-512x512.png` },
      { name: 'twitter:creator', content: `@${userData.username}` },
    ],
    links: [
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/fav/apple-touch-icon.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/fav/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/fav/favicon-16x16.png' },
      { rel: 'manifest', href: '/fav/site.webmanifest' },
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'alternate',
        type: 'application/rss+xml',
        title: 'hmziq.rs RSS Feed',
        href: `${siteUrl}/rss.xml`,
      },
      {
        rel: 'alternate',
        type: 'application/atom+xml',
        title: 'hmziq.rs Atom Feed',
        href: `${siteUrl}/atom.xml`,
      },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(jsonLd).replace(/<\/script/gi, '<\\/script'),
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        className="antialiased"
        style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh' }}
      >
        <a
          href="#skills"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        <WASMProvider>
          <AnalyticsProvider>
            <div id="root">{children}</div>
          </AnalyticsProvider>
        </WASMProvider>
        <Scripts />
      </body>
    </html>
  )
}
