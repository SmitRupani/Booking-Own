"use client";
import React from 'react';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'default' | 'ghost' | 'destructive';

export function Button({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm'|'md'|'lg'; className?: string }) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none';
  const variants: Record<Variant, string> = {
    default: 'bg-primary text-white hover:bg-primary/90 px-3 py-2',
    ghost: 'bg-transparent text-foreground hover:bg-muted/20 px-2 py-1',
    destructive: 'bg-red-600 text-white hover:bg-red-700 px-3 py-2',
  } as const;

  const sizes: Record<string,string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export default Button;
