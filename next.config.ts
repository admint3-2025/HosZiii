import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  allowedDevOrigins: [
    'http://10.10.43.10:3001',
    'https://ziii-helpdesk.ddns.net',
    'http://ziii-helpdesk.ddns.net',
  ],
}

export default nextConfig
