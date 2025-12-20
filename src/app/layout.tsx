import './globals.css'
import type { Metadata } from 'next'
import { Orbitron } from 'next/font/google'

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-orbitron',
})

export const metadata: Metadata = {
  title: 'ZIII Helpdesk',
  description: 'Mesa de ayuda ITIL: tickets, seguimiento y auditoría.',
  icons: {
    icon: 'https://integrational3.com.mx/logorigen/ZIII%20logo.png',
    shortcut: 'https://integrational3.com.mx/logorigen/ZIII%20logo.png',
    apple: 'https://integrational3.com.mx/logorigen/ZIII%20logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`min-h-screen bg-gray-50 text-gray-900 ${orbitron.variable}`}>
        {children}
      </body>
    </html>
  )
}
