import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'hmziqrs - Senior Software Engineer',
  description:
    'Personal landing page of hmziqrs - Senior Software Engineer with 9 years of experience in full-stack development, TypeScript, React, and modern web technologies.',
  keywords: [
    'hmziqrs',
    'Software Engineer',
    'TypeScript',
    'React',
    'Next.js',
    'Frontend',
    'Backend',
  ],
  authors: [{ name: 'hmziqrs', url: 'https://hmziq.rs' }],
  creator: 'hmziqrs',
  publisher: 'hmziqrs',
  metadataBase: new URL('https://hmziq.rs'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hmziq.rs',
    title: 'hmziqrs - Senior Software Engineer',
    description:
      'Personal landing page of hmziqrs - Senior Software Engineer with 9 years of experience in full-stack development.',
    siteName: 'hmziq.rs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'hmziqrs - Senior Software Engineer',
    description:
      'Personal landing page of hmziqrs - Senior Software Engineer with 9 years of experience in full-stack development.',
    creator: '@hmziqrs',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={inter.className}
        style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh' }}
        suppressHydrationWarning
      >
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
