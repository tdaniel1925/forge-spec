// Card component following DESIGN-SYSTEM.md specifications
// Supports standard, large, and dark variants

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'standard' | 'large' | 'dark'
  hover?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'standard', hover = false, ...props }, ref) => {
    return (
      <div
        className={cn(
          // Base styles
          'bg-neutral-50 dark:bg-neutral-900',
          // Border radius from DESIGN-SYSTEM.md
          {
            'rounded-[32px] p-8': variant === 'standard',
            'rounded-[40px] p-12': variant === 'large',
            'rounded-[32px] p-8 bg-neutral-950 text-neutral-50':
              variant === 'dark',
          },
          // Hover effect
          {
            'transition-shadow duration-300 hover:shadow-xl': hover,
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

export { Card }
