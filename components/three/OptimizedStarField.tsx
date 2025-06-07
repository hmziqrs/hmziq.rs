'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface OptimizedStarFieldProps {
  count?: number;
}

export function OptimizedStarField({ count = 3000 }: OptimizedStarFieldProps) {
  const meshRef = useRef<THREE.Points>(null);
  const prefersReducedMotion = useReducedMotion();

  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 100 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    return [positions, sizes];
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current || prefersReducedMotion) return;
    
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.01;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1}
        sizeAttenuation
        color="#888888"
        transparent
        opacity={0.8}
        vertexColors={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}