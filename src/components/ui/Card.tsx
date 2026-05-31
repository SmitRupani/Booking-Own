import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'gradient-border' | 'interactive' | 'shine' | 'aurora' | 'frosted' | 'tilt' | 'glare'
  hoverEffect?: boolean
  animated?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverEffect = false, animated = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'card-glass text-card-foreground',
        'transition-all duration-400 ease-out',
        animated && 'animate-fade-in-up',
        {
          '': variant === 'default',
          'hover:shadow-card-glow hover:border-accent-blue/30': variant === 'glow',
          'card-animated-border': variant === 'gradient-border',
          'cursor-pointer hover:scale-[1.02] hover:-translate-y-1 hover:shadow-card-glow active:scale-[0.99]': variant === 'interactive',
          'card-glow-animated': variant === 'shine',
          'gradient-border': variant === 'aurora',
          'card-frosted': variant === 'frosted',
          'card-3d-tilt cursor-pointer': variant === 'tilt',
          'card-glare cursor-pointer hover:shadow-card-glow': variant === 'glare',
        },
        hoverEffect && 'card-scale-hover cursor-pointer',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-4 sm:p-6', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  emoji?: string
  gradient?: boolean
}

const CardTitle = forwardRef<HTMLParagraphElement, CardTitleProps>(({ className, emoji, gradient = false, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-2xl font-bold leading-none tracking-tight', gradient ? 'text-gradient' : 'text-text-main', className)}
    {...props}
  >
    {emoji && (
      <span className="mr-2 inline-block text-2xl leading-none opacity-90 align-text-bottom" aria-hidden>
        {emoji}
      </span>
    )}
    {children}
  </h3>
))
CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-text-muted', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-4 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  emoji?: string
  value: string | number
  label: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(({ className, icon, emoji, value, label, trend, trendValue, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('card-glass p-4 sm:p-6 group hover:shadow-card-glow transition-all duration-400', 'hover:border-accent-blue/30 hover:-translate-y-1', className)}
    {...props}
  >
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        <p className="text-3xl font-bold text-text-main group-hover:text-accent-blue transition-colors">{value}</p>
        {trend && trendValue && (
          <p className={cn('text-xs font-medium flex items-center gap-1', trend === 'up' && 'text-success', trend === 'down' && 'text-danger', trend === 'neutral' && 'text-text-muted')}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trendValue}
          </p>
        )}
      </div>
      <div className="p-3 rounded-xl bg-accent-blue/10 group-hover:bg-accent-blue/20 transition-colors">
        {emoji ? <span className="text-2xl group-hover:animate-wiggle">{emoji}</span> : <div className="text-accent-blue group-hover:scale-110 transition-transform">{icon}</div>}
      </div>
    </div>
  </div>
))
StatCard.displayName = 'StatCard'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, StatCard }

export default Card
