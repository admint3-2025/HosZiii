import './globals.css'
import type { Metadata } from 'next'
import { Orbitron } from 'next/font/google'
import { WebViewBridge } from '@/components/WebViewBridge'

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-orbitron',
})

export const metadata: Metadata = {
  title: 'ZIII HoS',
  description: 'HoS: Operación y Mesa de Ayuda con trazabilidad ITIL.',
  icons: {
    icon: 'https://systemach-sas.com/logo_ziii/ZIII%20logo.png',
    shortcut: 'https://systemach-sas.com/logo_ziii/ZIII%20logo.png',
    apple: 'https://systemach-sas.com/logo_ziii/ZIII%20logo.png',
  },
  other: {
    'viewport': 'width=device-width, initial-scale=1, viewport-fit=cover',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`min-h-screen bg-gray-50 text-gray-900 ${orbitron.variable}`}>
        <WebViewBridge />
        {children}
      </body>
    </html>
  )
}
