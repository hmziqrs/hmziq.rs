import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { metadataConfig } from '@/lib/content/MetadataConfig'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh' }}
        suppressHydrationWarning
      >
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
