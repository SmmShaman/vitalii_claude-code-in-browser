/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uchmopqiylywnemvjttl.supabase.co',
      },
    ],
  },
  // Enable standalone output for easier deployment
  output: 'standalone',
}

export default nextConfig
