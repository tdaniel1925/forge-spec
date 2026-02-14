// Button component following DESIGN-SYSTEM.md specifications

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-lg font-medium transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Size variants
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-6 py-3 text-base': size === 'md',
            'px-8 py-4 text-lg': size === 'lg',
          },
          // Color variants
          {
            // Primary: Coral gradient from DESIGN-SYSTEM.md
            'bg-gradient-to-r from-[#FF7F50] to-[#FF6347] text-white hover:shadow-lg hover:-translate-y-0.5':
              variant === 'primary',
            // Secondary: Neutral with border
            'bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700':
              variant === 'secondary',
            // Ghost: Transparent
            'bg-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800':
              variant === 'ghost',
            // Danger: Red
            'bg-red-500 text-white hover:bg-red-600':
              variant === 'danger',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
