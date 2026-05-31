"use client";
import * as React from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({ title, description, className }: { title: string; description?: string; className?: string }) {
  return (
    <div className={cn('rounded-lg border p-8 text-center text-muted-foreground', className)}>
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      {description && <p className="mt-2">{description}</p>}
    </div>
  )
}

export default EmptyState
