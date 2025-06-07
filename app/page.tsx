'use client'

import dynamic from 'next/dynamic'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Skills from '@/components/sections/Skills'
import Contact from '@/components/sections/Contact'

// Dynamically import Three.js components to avoid SSR issues
const StarField = dynamic(() => import('@/components/three/StarField'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-space z-background" />
})

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* Background star field */}
      <StarField />
      
      {/* Content sections */}
      <div className="relative z-content">
        <Hero />
        <About />
        <Skills />
        <Contact />
      </div>
    </main>
  )
}