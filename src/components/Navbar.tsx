"use client";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import { Menu, X, LogOut, Shield, User } from 'lucide-react';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<'STUDENT' | 'ADMIN' | 'GUARD'>('STUDENT');
  const [userName, setUserName] = useState<string>('');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const pathname = usePathname();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();

  // Load real authenticated user session from DB / Guard session
  const fetchUserSession = useCallback(async () => {
    try {
      const res = await fetch('/api/user/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.role) {
          setRole(data.role as 'STUDENT' | 'ADMIN' | 'GUARD');
        }
        if (data.name) {
          setUserName(data.name);
        }
      } else {
        // Fallback to route inference
        if (pathname.startsWith('/guard')) {
          setRole('GUARD');
        } else if (pathname.startsWith('/admin')) {
          setRole('ADMIN');
        } else if (pathname.startsWith('/user')) {
          setRole('STUDENT');
        }
      }
    } catch {
      if (pathname.startsWith('/guard')) {
        setRole('GUARD');
      } else if (pathname.startsWith('/admin')) {
        setRole('ADMIN');
      }
    }
  }, [pathname]);

  useEffect(() => {
    fetchUserSession();
  }, [fetchUserSession, clerkUser]);

  // Fetch pending approvals count for admins
  useEffect(() => {
    if (role === 'ADMIN') {
      const fetchPendingCount = async () => {
        try {
          const res = await fetch('/api/admin/lab-approvals?status=PENDING');
          if (res.ok) {
            const data = await res.json();
            setPendingApprovalsCount(data.bookings?.length || 0);
          }
        } catch {
          // ignore network errors
        }
      };

      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [role]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      if (role === 'GUARD' || pathname.startsWith('/guard')) {
        await fetch('/api/auth/guard-logout', { method: 'POST' });
      }
      if (signOut) {
        await signOut({ redirectUrl: '/login' });
      }
    } catch {
      // ignore
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sst:role');
      }
      window.location.href = '/login';
    }
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
        { href: '/admin/lab-approvals', label: 'Approvals', badge: pendingApprovalsCount },
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

    // STUDENT (Default)
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
  const displayName = userName || clerkUser?.firstName || clerkUser?.emailAddresses[0]?.emailAddress?.split('@')[0] || (role === 'GUARD' ? 'Guard' : 'Student');

  // Don't show navbar on login page
  if (pathname === '/login' || pathname === '/sso-callback') {
    return null;
  }

  return (
    <nav className="border-b sticky top-0 z-50 bg-card/90 backdrop-blur-md transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image src="/sst-logo.png" alt="SST" width={140} height={36} className="object-contain" priority />
            <span className="font-semibold text-lg tracking-tight hidden sm:inline-block">SST Booking</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto py-1 no-scrollbar">
            {links.map((l) => {
              const isActive = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors relative flex items-center gap-1.5 whitespace-nowrap",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {l.label}
                  {!!l.badge && l.badge > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {l.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            {/* User status badge */}
            <div className="flex items-center gap-1.5 text-xs bg-muted/40 border rounded-md px-2.5 py-1">
              {role === 'GUARD' ? (
                <Shield className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span className="font-medium text-foreground">{displayName}</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                {role}
              </span>
            </div>

            <Button size="sm" variant="ghost" onClick={handleSignOut} className="gap-1.5 text-xs text-muted-foreground hover:text-destructive">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="lg:hidden border-t bg-card px-4 pt-2 pb-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{displayName}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {role}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={handleSignOut} className="text-xs text-destructive">
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "text-xs px-3 py-2 rounded-md font-medium flex items-center justify-between",
                  pathname === l.href ? "bg-primary text-primary-foreground font-semibold" : "bg-muted/40 hover:bg-muted"
                )}
              >
                <span>{l.label}</span>
                {!!l.badge && l.badge > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {l.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
