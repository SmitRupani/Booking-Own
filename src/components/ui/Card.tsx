"use client";
import React from 'react';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"rounded-lg border p-4 bg-card card-shadow " + (className || '')}>
      {children}
    </div>
  );
}

export default Card;
