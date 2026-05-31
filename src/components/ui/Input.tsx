'use client'

import React, { InputHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  error?: boolean
  success?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, iconPosition = 'left', error, success, ...props }, ref) => {
    const hasIcon = !!icon

    return (
      <div className="relative">
        {hasIcon && (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-colors',
              'peer-focus:text-primary',
              iconPosition === 'left' ? 'left-3' : 'right-3',
              error && 'text-danger',
              success && 'text-success'
            )}
          >
            {icon}
          </div>
        )}

        <input
          type={type}
          className={cn(
            'peer flex h-11 w-full rounded-xl border bg-secondary/30 text-sm text-foreground',
            'ring-offset-background transition-all duration-300',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground/70',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            'focus-visible:border-primary/50 focus-visible:bg-secondary/50',
            'focus-visible:shadow-[0_0_20px_rgba(13,140,232,0.15)]',
            'hover:border-border hover:bg-secondary/40',
            hasIcon && iconPosition === 'left' ? 'pl-10 pr-4' : '',
            hasIcon && iconPosition === 'right' ? 'pr-10 pl-4' : '',
            !hasIcon && 'px-4',
            'border-border/50',
            error && 'border-danger/50 focus-visible:ring-danger/50 focus-visible:border-danger/50 bg-danger/5',
            success && 'border-success/50 focus-visible:ring-success/50 focus-visible:border-success/50 bg-success/5',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  success?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, success, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[100px] w-full rounded-xl border bg-secondary/30 px-4 py-3 text-sm text-foreground',
        'ring-offset-background transition-all duration-300 resize-none',
        'placeholder:text-muted-foreground/70',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        'focus-visible:border-primary/50 focus-visible:bg-secondary/50',
        'focus-visible:shadow-[0_0_20px_rgba(13,140,232,0.15)]',
        'hover:border-border hover:bg-secondary/40',
        'border-border/50',
        error && 'border-danger/50 focus-visible:ring-danger/50 focus-visible:border-danger/50 bg-danger/5',
        success && 'border-success/50 focus-visible:ring-success/50 focus-visible:border-success/50 bg-success/5',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})

Textarea.displayName = 'Textarea'

interface SearchInputProps extends Omit<InputProps, 'icon' | 'iconPosition'> {
  onSearch?: (value: string) => void
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, onChange, ...props }: SearchInputProps, ref) => {
  return (
    <Input
      type="search"
      icon={
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      iconPosition="left"
      placeholder="Search..."
      className={cn('pr-4', className)}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) onChange(e)
        if (onSearch) onSearch(e.target.value)
      }}
      ref={ref}
      {...props}
    />
  )
}
)

SearchInput.displayName = 'SearchInput'

export { Input, Textarea, SearchInput }
