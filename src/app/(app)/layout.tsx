// App layout with sidebar navigation
// Wraps all authenticated app pages

import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-950">
      <Sidebar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
