"use client";
import React from 'react';

export function Dialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative rounded-lg bg-card p-6 z-10 max-w-lg w-full">{children}</div>
    </div>
  );
}

export default Dialog;
