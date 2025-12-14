import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Suppress hydration warnings from browser extensions
  reactStrictMode: true,
  // Optimize for Netlify
  output: 'standalone',
  // Disable ESLint during builds (not installed)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
