'use client'

import dynamic from 'next/dynamic'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Skills from '@/components/sections/Skills'
import Contact from '@/components/sections/Contact'

// Dynamically import Three.js components to avoid SSR issues
const StarField = dynamic(() => import('@/components/three/SimpleStarField'), {
  ssr: false,
  loading: () => <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: -10 }} />
})

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* Background star field */}
      <StarField />
      
      {/* Content sections */}
      <div className="relative" style={{ zIndex: 10 }}>
        <Hero />
        <About />
        <Skills />
        <Contact />
      </div>
    </main>
  )
}