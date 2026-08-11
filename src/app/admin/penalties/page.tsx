'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  ShieldAlert,
  Search,
  UserCheck,
  Ban,
  Plus,
  RefreshCw,
  User,
} from 'lucide-react';

interface PenaltyUser {
  id: number;
  name: string;
  email: string;
  penaltyPoints: number;
  blocked: boolean;
  suspendedUntil: string | null;
}

export default function AdminPenaltiesPage() {
  const [users, setUsers] = useState<PenaltyUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PenaltyUser | null>(null);
  const [pointsToAssign, setPointsToAssign] = useState('2');
  const [penaltyReason, setPenaltyReason] = useState('No-Show violation');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUsers([
            {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              penaltyPoints: data.user.penaltyPoints || 0,
              blocked: data.user.blocked || false,
              suspendedUntil: data.user.suspendedUntil,
            },
          ]);
        }
      }
    } catch {
      setError('Failed to load user records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleIssuePenalty = (user: PenaltyUser) => {
    setSelectedUser(user);
    setIssueModalOpen(true);
  };

  const handleConfirmIssue = () => {
    if (!selectedUser) return;
    const addedPoints = Number(pointsToAssign) || 1;
    setUsers(
      users.map((u) =>
        u.id === selectedUser.id
          ? { ...u, penaltyPoints: u.penaltyPoints + addedPoints }
          : u
      )
    );
    setIssueModalOpen(false);
  };

  const handleToggleBlock = (userId: number) => {
    setUsers(
      users.map((u) => (u.id === userId ? { ...u, blocked: !u.blocked } : u))
    );
  };

  const handleClearPoints = (userId: number) => {
    setUsers(
      users.map((u) => (u.id === userId ? { ...u, penaltyPoints: 0 } : u))
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Disciplinary Station</Badge>
            <Badge variant="destructive">Policy Enforcement</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Student Penalties & Standing</h1>
          <p className="text-sm text-muted-foreground">
            Monitor accumulated infraction points, forgive accidental penalties, and manage account suspensions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          className="gap-1.5 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student by name or email..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Loading student standing...
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-muted-foreground">
          <p className="text-sm">No student records found.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => (
            <Card key={u.id} className="border hover:border-primary/40 transition-all">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{u.name}</h4>
                      <Badge variant={u.blocked ? 'destructive' : u.penaltyPoints > 0 ? 'warning' : 'success'}>
                        {u.blocked ? 'Blocked' : `${u.penaltyPoints} Points`}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleIssuePenalty(u)}
                    className="gap-1 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Issue Penalty
                  </Button>
                  {u.penaltyPoints > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleClearPoints(u.id)}
                      className="text-emerald-400 hover:bg-emerald-500/10 text-xs"
                    >
                      Clear Points
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleBlock(u.id)}
                    className={`text-xs ${
                      u.blocked ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-destructive hover:bg-destructive/10'
                    }`}
                  >
                    {u.blocked ? 'Unblock' : 'Block User'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Issue Penalty Modal */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Assign Penalty Points"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm">
            Assigning infraction points to <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
          </p>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Points:</label>
            <select
              value={pointsToAssign}
              onChange={(e) => setPointsToAssign(e.target.value)}
              className="w-full h-10 px-3 mt-1 rounded-md border bg-background text-sm"
            >
              <option value="1">1 Point (Minor Infraction)</option>
              <option value="2">2 Points (No-Show / Damaged Item)</option>
              <option value="4">4 Points (Severe Violation / Suspension)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Reason:</label>
            <Input
              type="text"
              value={penaltyReason}
              onChange={(e) => setPenaltyReason(e.target.value)}
              placeholder="e.g. Unreturned basketball gear after slot"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="w-1/2"
              onClick={() => setIssueModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-1/2"
              onClick={handleConfirmIssue}
            >
              Confirm Penalty
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
