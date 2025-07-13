import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  reactStrictMode: true,
  trailingSlash: true, // Better for static hosting compatibility
  poweredByHeader: false, // Security: Remove X-Powered-By header
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: true, // Required for static export
  },
  webpack: (config, { isServer }) => {
    // Add WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }

    // Add rule for WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    })

    // Copy WASM files to public directory in production
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }

    return config
  },
}

export default nextConfig
