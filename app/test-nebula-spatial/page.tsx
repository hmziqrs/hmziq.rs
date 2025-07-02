import dynamic from 'next/dynamic'

const NebulaSpatialBenchmark = dynamic(() => import('@/components/debug/NebulaSpatialBenchmark'), {
  ssr: false,
})

export default function TestNebulaSpatialPage() {
  return (
    <div className="min-h-screen bg-black p-8">
      <h1 className="text-3xl font-bold mb-8 text-white">Nebula Spatial Indexing Testing</h1>
      
      <div className="max-w-6xl mx-auto">
        <NebulaSpatialBenchmark />
      </div>
    </div>
  )
}