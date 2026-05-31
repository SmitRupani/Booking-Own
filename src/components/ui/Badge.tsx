"use client";
import React from 'react';

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-primary text-white " + (className || '')}>
      {children}
    </span>
  );
}

export default Badge;
