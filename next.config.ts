import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb', // Permitir archivos hasta 15 MB (margen para metadata)
    },
  },
  allowedDevOrigins: ['http://10.10.43.10:3001'],
}

export default nextConfig
