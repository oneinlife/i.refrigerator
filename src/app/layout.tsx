import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/ToastProvider'
import GoogleApiProvider from '@/components/GoogleApiProvider'

export const metadata: Metadata = {
  title: 'i.refrigerator',
  description: 'Refrigerator inventory management app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <GoogleApiProvider>
          {children}
          <ToastProvider />
        </GoogleApiProvider>
      </body>
    </html>
  )
}
