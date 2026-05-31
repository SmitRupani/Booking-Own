"use client";
import React from 'react';

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"overflow-auto rounded-lg border bg-card p-2 " + (className || '')}>
      <table className="min-w-full text-left">{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="text-sm text-muted-foreground">{children}</thead>;
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-border/20">{children}</tr>;
}

export default Table;
