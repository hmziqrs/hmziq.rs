import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { metadataConfig } from '@/lib/content/MetadataConfig'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = metadataConfig.getMetadata()

export const viewport: Viewport = metadataConfig.getViewport()

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
