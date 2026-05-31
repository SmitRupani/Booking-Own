import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border p-4 bg-card card-shadow', className)} {...props}>
      {children}
    </div>
  )
)
Card.displayName = 'Card'

export default Card
