"use client";
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-all duration-300 whitespace-nowrap', {
  variants: {
    variant: {
      default: 'bg-gradient-to-r from-badge-blue to-accent-blue text-white shadow-sm shadow-badge-blue/30',
      secondary: 'bg-bg-dark text-text-muted border border-card-border hover:border-accent-blue/30',
      destructive: 'bg-gradient-to-r from-danger to-red-400 text-white shadow-sm shadow-danger/30',
      success: 'bg-gradient-to-r from-success to-emerald-400 text-white shadow-sm shadow-success/30',
      warning: 'bg-gradient-to-r from-warning to-amber-400 text-white shadow-sm shadow-warning/30',
      info: 'bg-gradient-to-r from-accent-cyan to-accent-teal text-white shadow-sm shadow-accent-cyan/30',
      premium: 'bg-gradient-to-r from-accent-purple-1 via-accent-purple-2 to-accent-pink text-white shadow-sm shadow-accent-purple-1/30 animate-shimmer bg-[length:200%_100%]',
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

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'checked_in' | 'no_show' | 'late' | 'approved' | 'rejected'
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; icon: string; label: string }> = {
    confirmed: { variant: 'success', icon: '✅', label: 'Confirmed' },
    pending: { variant: 'warning', icon: '⏳', label: 'Pending' },
    cancelled: { variant: 'destructive', icon: '❌', label: 'Cancelled' },
    completed: { variant: 'secondary', icon: '✔️', label: 'Completed' },
    checked_in: { variant: 'info', icon: '📍', label: 'Checked In' },
    no_show: { variant: 'destructive', icon: '👻', label: 'No Show' },
    late: { variant: 'destructive', icon: '⚠️', label: 'Late' },
    approved: { variant: 'success', icon: '👍', label: 'Approved' },
    rejected: { variant: 'destructive', icon: '👎', label: 'Rejected' },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={className} {...props}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  )
}
