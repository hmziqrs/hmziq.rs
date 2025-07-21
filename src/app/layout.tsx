import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { metadataConfig } from '@/lib/content/MetadataConfig'
import { AnalyticsProvider } from '@/providers/analytics'
import { WASMProvider } from '@/contexts/WASMContext'
import userData from '@/content/data/user.json'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '400 500 600',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '400 500 600',
})

export const metadata: Metadata = metadataConfig.getMetadata()

export const viewport: Viewport = metadataConfig.getViewport()

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: userData.name,
  jobTitle: userData.title,
  description: `${userData.title} with ${userData.yearsOfExperience} years of experience in full-stack development, specializing in modern web technologies.`,
  url: userData.websites.portfolio,
  sameAs: [
    `https://github.com/${userData.username}`,
    `https://linkedin.com/in/${userData.username}`,
    `https://twitter.com/${userData.username}`,
  ],
  email: userData.email,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/fav/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/fav/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/fav/favicon-16x16.png"
        />
        <link rel="manifest" href="/fav/site.webmanifest" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh' }}
        suppressHydrationWarning
      >
        <WASMProvider>
          <AnalyticsProvider>
            <div id="root">{children}</div>
          </AnalyticsProvider>
        </WASMProvider>
      </body>
    </html>
  )
}
