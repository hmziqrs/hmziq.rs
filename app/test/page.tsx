'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Skills from '@/components/sections/Skills'
import Contact from '@/components/sections/Contact'

// Original JS StarField
const StarFieldJS = dynamic(() => import('@/components/legacy/StarField'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: -10 }} />
  ),
})

// WASM-optimized StarField
const StarFieldWASM = dynamic(() => import('@/components/three/StarField'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: -10 }} />
  ),
})

// Dynamically import 2D effects
const MeteorShower2D = dynamic(() => import('@/components/effects/MeteorShower'), {
  ssr: false,
})

const LightNebula2D = dynamic(() => import('@/components/effects/LightNebula'), {
  ssr: false,
})

export default function TestPage() {
  const searchParams = useSearchParams()
  const implementation = searchParams.get('impl') || 'js'
  
  return (
    <main className="relative min-h-screen">
      {/* Render different star field based on URL parameter */}
      {implementation === 'wasm' ? <StarFieldWASM /> : <StarFieldJS />}
      
      {/* 2D Nebula clouds - lightweight version */}
      <LightNebula2D />

      {/* 2D Meteor shower overlay */}
      <MeteorShower2D />

      {/* Content sections */}
      <div className="relative" style={{ zIndex: 10 }}>
        <Hero />
        <About />
        <Skills />
        <Contact />
      </div>
      
      {/* Performance indicator */}
      <div 
        id="performance-indicator" 
        className="fixed top-4 left-4 bg-black/80 text-white p-2 rounded text-xs font-mono"
        style={{ zIndex: 100 }}
      >
        Implementation: {implementation.toUpperCase()}
      </div>
    </main>
  )
}