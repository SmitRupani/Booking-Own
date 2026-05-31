"use client";
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-primary text-white',
      secondary: 'bg-muted text-muted-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, children, ...props }, ref) => {
  return (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  )
})
Badge.displayName = 'Badge'

export default Badge
