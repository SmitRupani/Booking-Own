"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from './ui/Button';

export function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/user/dashboard', label: 'Dashboard' },
    { href: '/user/facilities', label: 'Facilities' },
    { href: '/user/rooms', label: 'Rooms' },
    { href: '/user/equipment', label: 'Equipment' },
    { href: '/user/bookings', label: 'My Bookings' },
  ];

  return (
    <nav className="border-b bg-card/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/sst-logo.png" alt="SST" width={160} height={40} className="object-contain" />
            <span className="font-semibold">SST Booking</span>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm px-3 py-2 rounded-md hover:bg-muted/20">
                {l.label}
              </Link>
            ))}
            <Button variant="ghost">Sign Out</Button>
          </div>

          <div className="md:hidden">
            <Button variant="ghost" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</Button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4">
          <div className="space-y-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="block px-3 py-2 rounded-md">{l.label}</Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
