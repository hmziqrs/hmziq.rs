import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router'

import { StarFieldBackground } from '~/components/three/StarFieldBackground'
import metadataData from '~/content/data/metadata.json'
import userData from '~/content/data/user.json'
import { AnalyticsProvider } from '~/contexts/AnalyticsContext'
import { WASMProvider } from '~/contexts/WASMContext'
import { homeDescription, homeTitle, siteUrl } from '~/lib/seo'

import appCss from '~/styles.css?url'

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
        content: `width=${metadataData.viewport.width}, initial-scale=${metadataData.viewport.initialScale}`,
      },
      { title: homeTitle },
      { name: 'description', content: homeDescription },
      { name: 'theme-color', content: metadataData.theme.themeColor },
      { name: 'robots', content: 'index, follow' },
      { name: 'keywords', content: metadataData.seo.additionalKeywords.join(', ') },
      { name: 'yandex-verification', content: '2c30efbb908a334d' },
      { property: 'og:type', content: metadataData.openGraph.type },
      { property: 'og:locale', content: metadataData.openGraph.locale },
      { property: 'og:url', content: siteUrl },
      { property: 'og:title', content: homeTitle },
      { property: 'og:description', content: homeDescription },
      { property: 'og:image', content: `${siteUrl}/fav/android-chrome-512x512.png` },
      { property: 'og:site_name', content: new URL(siteUrl).hostname },
      { name: 'twitter:card', content: metadataData.twitter.card },
      { name: 'twitter:title', content: homeTitle },
      { name: 'twitter:description', content: homeDescription },
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
        <div>
          <a
            href="#hero"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-200 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black"
          >
            Skip to content
          </a>
        </div>
        <WASMProvider>
          <AnalyticsProvider>
            <StarFieldBackground />
            <div id="root" className="relative" style={{ zIndex: 2 }}>
              {children}
            </div>
          </AnalyticsProvider>
        </WASMProvider>
        <Scripts />
      </body>
    </html>
  )
}
