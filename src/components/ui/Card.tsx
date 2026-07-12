import * as React from "react"

import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'gradient-border' | 'interactive' | 'shine' | 'aurora' | 'frosted' | 'tilt' | 'glare'
  hoverEffect?: boolean
  animated?: boolean
  size?: "default" | "sm"
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverEffect = false, animated = false, size = "default", ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
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
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

interface CardTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  emoji?: string
  gradient?: boolean
}

const CardTitle = React.forwardRef<HTMLDivElement, CardTitleProps>(
  ({ className, emoji, gradient = false, children, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        gradient ? 'text-gradient' : 'text-text-main',
        className
      )}
      {...props}
    >
      {emoji && (
        <span className="mr-2 inline-block text-2xl leading-none opacity-90 align-text-bottom" aria-hidden>
          {emoji}
        </span>
      )}
      {children}
    </div>
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

const CardAction = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
)
CardAction.displayName = "CardAction"

const CardContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  emoji?: string
  value: string | number
  label: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, icon, emoji, value, label, trend, trendValue, ...props }, ref) => (
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
  )
)
StatCard.displayName = 'StatCard'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  StatCard,
}

export default Card
