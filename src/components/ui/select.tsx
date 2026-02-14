// Select component following DESIGN-SYSTEM.md form specifications

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          className={cn(
            'flex h-12 w-full rounded-lg border px-4 py-3 text-base transition-all',
            'bg-white dark:bg-neutral-900',
            'border-neutral-200 dark:border-neutral-700',
            'focus:border-[#FF7F50] focus:outline-none focus:ring-3 focus:ring-[#FF7F50]/10',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
