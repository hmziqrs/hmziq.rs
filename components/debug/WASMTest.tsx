'use client';

import { useEffect, useState } from 'react';
import { getOptimizedFunctions } from '@/lib/wasm';

export function WASMTest() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testWASM() {
      try {
        const funcs = await getOptimizedFunctions();
        
        // Test add function
        const sum = funcs.add(40, 2);
        const greeting = funcs.greet('Space Explorer');
        
        setResult(`WASM Test Results:
- Addition: 40 + 2 = ${sum}
- Greeting: ${greeting}`);
      } catch (error) {
        setResult(`Error loading WASM: ${error}`);
      } finally {
        setLoading(false);
      }
    }

    testWASM();
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 border border-white/20 rounded p-4 text-xs font-mono text-white">
      <h3 className="text-sm font-bold mb-2">WASM Integration Test</h3>
      {loading ? (
        <p className="text-gray-400">Loading WASM module...</p>
      ) : (
        <pre className="whitespace-pre-wrap">{result}</pre>
      )}
    </div>
  );
}