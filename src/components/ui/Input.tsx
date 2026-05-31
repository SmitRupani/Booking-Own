"use client";
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva('flex h-10 w-full rounded-md border px-3 py-2 bg-transparent text-card-foreground placeholder:text-muted-foreground', {
  variants: {
    variant: {
      default: '',
      subtle: 'bg-muted/10',
    },
    size: {
      default: 'h-10',
      sm: 'h-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & VariantProps<typeof inputVariants>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, variant, size, ...props }, ref) => {
  return <input ref={ref} className={cn(inputVariants({ variant, size }), className)} {...props} />
})
Input.displayName = 'Input'

export default Input
