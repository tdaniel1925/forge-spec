import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ForgeSpec - Turn Any Idea Into a Production-Ready Spec',
  description:
    'ForgeSpec researches your domain, decomposes every feature into atomic components, and generates a spec document ready for Claude Code. Free forever.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
