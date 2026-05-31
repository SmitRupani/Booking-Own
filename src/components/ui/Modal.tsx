'use client'

import * as React from 'react'
import { Dialog as RadixDialog, DialogContent as RadixDialogContent } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  titleEmoji?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export function Modal({
  isOpen,
  onClose,
  title,
  titleEmoji,
  children,
  size = 'md',
  variant = 'default',
}: ModalProps) {
  const variantStyles: Record<string, string> = {
    default: 'border-card-border',
    success: 'border-success/30 shadow-[0_0_30px_rgba(39,196,106,0.15)]',
    warning: 'border-warning/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]',
    danger: 'border-danger/30 shadow-[0_0_30px_rgba(255,107,107,0.15)]',
  }

  const titleColors: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  }

  return (
    <RadixDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <RadixDialogContent
        className={cn(
          'z-50 w-full rounded-2xl bg-bg-dark border shadow-2xl flex flex-col',
          'transition-all duration-300 ease-out max-h-[90vh] md:max-h-[85vh] safe-area-bottom',
          variantStyles[variant],
          sizeClasses[size]
        )}
      >
        {/* Header */}
        {title && (
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-card-border/50">
            <h2 className={cn('text-xl font-bold flex items-center gap-2', titleColors[variant])}>
              {titleEmoji && <span className="text-2xl">{titleEmoji}</span>}
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar no-overscroll">{children}</div>
      </RadixDialogContent>
    </RadixDialog>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
  loading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmModalProps) {
  const variantConfig: Record<string, { emoji: string; buttonClass: string }> = {
    danger: { emoji: '⚠️', buttonClass: 'bg-danger hover:bg-danger/90' },
    warning: { emoji: '⚡', buttonClass: 'bg-warning hover:bg-warning/90' },
    default: { emoji: '❓', buttonClass: 'bg-accent-blue hover:bg-accent-blue/90' },
  }

  const config = variantConfig[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} titleEmoji={config.emoji} size="sm" variant={variant}>
      <div className="space-y-6">
        <p className="text-text-muted">{message}</p>

        <div className="flex gap-3">
          <Button onClick={onClose} disabled={loading} className="flex-1 border border-card-border bg-bg-dark text-text-main">
            {cancelText}
          </Button>
          <Button onClick={onConfirm} disabled={loading} className={cn('flex-1 text-white', config.buttonClass)}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default Modal
