import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CuboDemo',
  description: 'Dynamic image display',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, background: '#000' }}>{children}</body>
    </html>
  )
}
