// Loading spinner component
// From DESIGN-SYSTEM.md animations section

import { cn } from '@/lib/utils/cn'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'inline-block rounded-full border-3 border-neutral-200 dark:border-neutral-700 border-t-[#FF7F50] animate-spin',
        {
          'h-4 w-4 border-2': size === 'sm',
          'h-6 w-6 border-3': size === 'md',
          'h-8 w-8 border-4': size === 'lg',
        },
        className
      )}
    />
  )
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading...</p>
      </div>
    </div>
  )
}
