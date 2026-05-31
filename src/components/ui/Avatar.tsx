'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ src, alt, name, size = 'md', className, ...props }, ref) => {
    const initials = (name || alt || '')
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    return (
      <AvatarPrimitive.Root ref={ref} className={cn('inline-block align-middle overflow-hidden rounded-full bg-muted', sizeMap[size], className)} {...props}>
        {src ? (
          <AvatarPrimitive.Image
            className="block object-cover h-full w-full"
            src={src}
            alt={alt || name || 'Avatar'}
            onError={(e) => {
              // hide broken image; fallback will show
              const t = e.currentTarget as HTMLImageElement
              t.style.display = 'none'
            }}
          />
        ) : null}
        <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card-bg to-muted text-sm font-medium text-foreground">
          {initials || '👤'}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
    )
  }
)

Avatar.displayName = 'Avatar'

export default Avatar
