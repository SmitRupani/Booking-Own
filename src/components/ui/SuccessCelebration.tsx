"use client";

import React, { useEffect } from 'react';
import { CheckCircle2, CalendarCheck, PartyPopper } from 'lucide-react';

interface SuccessCelebrationProps {
  show: boolean;
  message?: string;
  subMessage?: string;
  type?: 'booking' | 'general';
}

export function SuccessCelebration({
  show,
  message = 'Success!',
  subMessage = 'Redirecting...',
  type = 'booking',
}: SuccessCelebrationProps) {
  useEffect(() => {
    if (show) {
      // placeholder for confetti or analytics hook
    } else {
      // reset if needed
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-dark/80 backdrop-blur-sm">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/20 via-card to-cyan-500/10 border border-emerald-500/30 p-8 max-w-sm mx-4 shadow-2xl">
        <div className="relative flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-text-main flex items-center justify-center gap-2">
              {message}
              <span>
                {type === 'booking' ? (
                  <CalendarCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <PartyPopper className="w-6 h-6 text-emerald-400" />
                )}
              </span>
            </h3>
            <p className="text-text-muted text-sm">{subMessage}</p>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-150" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function InlineSuccess({ show, message = 'Success!' }: { show: boolean; message?: string }) {
  useEffect(() => {
    if (show) {
      // placeholder
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 p-4 flex items-center gap-3">
      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
      <p className="text-sm text-emerald-300 font-medium">{message}</p>
    </div>
  );
}

export default SuccessCelebration;
