"use client";
import React from 'react';
import Link from 'next/link';

export function Sidebar({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="w-64 shrink-0 border-r p-4 hidden lg:block">
      <div className="space-y-4">
        <div className="font-semibold">Navigation</div>
        <nav className="flex flex-col space-y-1 text-sm">
          <Link href="/user/dashboard" className="px-2 py-1 rounded-md hover:bg-muted/20">Dashboard</Link>
          <Link href="/user/facilities" className="px-2 py-1 rounded-md hover:bg-muted/20">Facilities</Link>
          <Link href="/user/rooms" className="px-2 py-1 rounded-md hover:bg-muted/20">Rooms</Link>
          <Link href="/user/equipment" className="px-2 py-1 rounded-md hover:bg-muted/20">Equipment</Link>
          <Link href="/user/bookings" className="px-2 py-1 rounded-md hover:bg-muted/20">My Bookings</Link>
        </nav>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </aside>
  );
}

export default Sidebar;
