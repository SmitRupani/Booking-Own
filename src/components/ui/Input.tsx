"use client";
import React from 'react';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={"w-full rounded-md border px-3 py-2 bg-transparent text-white placeholder:text-muted-foreground " + (props.className || '')}
    />
  );
}

export default Input;
