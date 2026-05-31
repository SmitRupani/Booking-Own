"use client";
import React from 'react';

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border p-8 text-center text-muted-foreground">
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      {description && <p className="mt-2">{description}</p>}
    </div>
  );
}

export default EmptyState;
