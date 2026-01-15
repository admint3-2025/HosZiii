import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Workaround for intermittent dev-only RSC/client-manifest crashes seen in this workspace.
    // Disables Next DevTools' Segment Explorer injection (SegmentViewNode).
    devtoolSegmentExplorer: false,
    serverActions: {
      bodySizeLimit: '15mb', // Permitir archivos hasta 15 MB (margen para metadata)
    },
  },
  allowedDevOrigins: [
    'http://10.10.43.10:3001',
    'https://ziii-helpdesk.ddns.net',
    'http://ziii-helpdesk.ddns.net',
  ],
}

export default nextConfig
