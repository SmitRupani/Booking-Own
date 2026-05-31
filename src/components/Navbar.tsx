"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from './ui/Button';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<'STUDENT' | 'ADMIN' | 'GUARD'>('STUDENT');

  // Read role from localStorage for development/testing. Later integrate Clerk.
  useState(() => {
    if (typeof window !== 'undefined') {
      const r = (localStorage.getItem('sst:role') as 'STUDENT' | 'ADMIN' | 'GUARD') || 'STUDENT';
      setRole(r);
    }
  });

  const setRoleAndSave = (r: 'STUDENT' | 'ADMIN' | 'GUARD') => {
    setRole(r);
    if (typeof window !== 'undefined') localStorage.setItem('sst:role', r);
  };

  const getNavLinks = () => {
    if (role === 'GUARD') {
      return [
        { href: '/guard/scanner', label: 'Scanner' },
        { href: '/guard/returns', label: 'Equipment Returns' },
        { href: '/guard/library-returns', label: 'Library Returns' },
        { href: '/guard/history', label: 'History' },
      ];
    }

    if (role === 'ADMIN') {
      return [
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/resources', label: 'Resources' },
        { href: '/admin/lab-approvals', label: 'Approvals' },
        { href: '/admin/bookings', label: 'Bookings' },
        { href: '/admin/group-bookings', label: 'Group Bookings' },
        { href: '/admin/blocks', label: 'Blocks' },
        { href: '/admin/penalties', label: 'Penalties' },
        { href: '/admin/settings', label: 'Settings' },
        { href: '/admin/email-routing', label: 'Email Routing' },
        { href: '/admin/audit-logs', label: 'Audit Logs' },
        { href: '/admin/bulk-operations', label: 'Bulk Ops' },
        { href: '/admin/analytics', label: 'Analytics' },
      ];
    }

    // STUDENT
    return [
      { href: '/user/dashboard', label: 'Dashboard' },
      { href: '/user/facilities', label: 'Facilities' },
      { href: '/user/rooms', label: 'Rooms' },
      { href: '/user/equipment', label: 'Equipment' },
      { href: '/user/library', label: 'Library' },
      { href: '/user/group-invitations', label: 'Group Invites' },
      { href: '/user/bookings', label: 'My Bookings' },
      { href: '/user/penalties', label: 'Rules & Penalties' },
    ];
  };

  const links = getNavLinks();

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

            {/* Role selector for testing; replace with real auth UI when Clerk is integrated */}
            <select
              value={role}
              onChange={(e) => setRoleAndSave(e.target.value as 'STUDENT' | 'ADMIN' | 'GUARD')}
              className="bg-transparent text-sm border rounded px-2 py-1 ml-2"
              aria-label="Role selector"
            >
              <option value="STUDENT">Student</option>
              <option value="ADMIN">Admin</option>
              <option value="GUARD">Guard</option>
            </select>

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
