import dynamic from 'next/dynamic'

const MeteorWASMBenchmark = dynamic(() => import('@/components/debug/MeteorWASMBenchmark'), {
  ssr: false,
})

export default function TestMeteorWASMPage() {
  return (
    <div className="min-h-screen bg-black p-8">
      <h1 className="text-3xl font-bold mb-8 text-white">Meteor WASM Testing</h1>
      
      <div className="max-w-4xl mx-auto">
        <MeteorWASMBenchmark />
      </div>
    </div>
  )
}