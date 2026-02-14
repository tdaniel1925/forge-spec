// Badge component for status indicators
// Following DESIGN-SYSTEM.md badge specifications

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    return (
      <div
        className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
          {
            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300':
              variant === 'success',
            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300':
              variant === 'warning',
            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300':
              variant === 'error',
            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300':
              variant === 'info',
            'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300':
              variant === 'neutral',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }
