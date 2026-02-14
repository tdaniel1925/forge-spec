// Textarea component following DESIGN-SYSTEM.md form specifications

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[120px] w-full rounded-lg border px-4 py-3 text-base transition-all resize-vertical',
            'bg-white dark:bg-neutral-900',
            'border-neutral-200 dark:border-neutral-700',
            'placeholder:text-neutral-400',
            'focus:border-[#FF7F50] focus:outline-none focus:ring-3 focus:ring-[#FF7F50]/10',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
