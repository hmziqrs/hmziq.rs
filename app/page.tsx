'use client'

import dynamic from 'next/dynamic'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Skills from '@/components/sections/Skills'
import Contact from '@/components/sections/Contact'

// Dynamically import Three.js components to avoid SSR issues (deprecated)
const StarField3D = dynamic(() => import('@/components/three/SimpleStarField'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: -10 }} />
  ),
})

// Dynamically import 2D effects
const MeteorShower2D = dynamic(() => import('@/components/effects/MeteorShower2D'), {
  ssr: false,
})

const Nebula2D = dynamic(() => import('@/components/effects/Nebula2D'), {
  ssr: false,
})

const LightNebula2D = dynamic(() => import('@/components/effects/LightNebula2D'), {
  ssr: false,
})

const StarField2D = dynamic(() => import('@/components/effects/StarField2D'), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* 2D Background star field */}
      <StarField2D />

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
    </main>
  )
}
