'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  Camera,
  Keyboard,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Package,
  Sparkles,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRValidationResult {
  booking: {
    id: number | string;
    kind: string;
    status: string;
    items?: { name: string; qty: number }[];
    resourceName: string;
    startAt?: string;
    endAt?: string;
  };
  student?: {
    id: number | string;
    name?: string;
    email: string;
    rollNumber?: string;
  };
}

const playSound = (type: 'success' | 'error') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'success') {
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.4);
    } else {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(110, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.35);
    }
  } catch {
    // Audio context may not be supported or allowed
  }
};

export default function GuardScannerPage() {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualToken, setManualToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<QRValidationResult | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      setError('');
      setResult(null);
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await handleScanToken(decodedText);
          try {
            await scanner.stop();
            setScanning(false);
          } catch {}
        },
        () => {}
      );
      setScanning(true);
    } catch {
      setError('Could not access camera. Please check camera permissions or use manual entry.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
      } catch {}
    }
  };

  const handleScanToken = async (token: string) => {
    setValidating(true);
    setError('');

    try {
      const res = await fetch('/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        playSound('error');
        setError(data.error || 'Invalid or expired QR code pass');
        setValidating(false);
        return;
      }

      playSound('success');
      setResult(data);
    } catch {
      playSound('error');
      setError('Failed to validate QR token.');
    } finally {
      setValidating(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleScanToken(manualToken);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Security Station</Badge>
          <Badge variant="success">Gate Access Scanner</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">QR Gate Verification</h1>
        <p className="text-sm text-muted-foreground">
          Scan student QR passes or enter manual security tokens for rapid check-in and checkout.
        </p>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {/* Mode Selector */}
      <div className="flex gap-3">
        <Button
          variant={mode === 'camera' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('camera');
            setResult(null);
          }}
          className="gap-2"
        >
          <Camera className="w-4 h-4" />
          Camera Scanner
        </Button>
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            stopScanner();
            setMode('manual');
            setResult(null);
          }}
          className="gap-2"
        >
          <Keyboard className="w-4 h-4" />
          Manual Token Entry
        </Button>
      </div>

      {mode === 'camera' ? (
        <Card className="border p-6 text-center space-y-4">
          <div
            id="qr-reader"
            className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-muted/40 aspect-square flex items-center justify-center border"
          />
          {!scanning ? (
            <Button onClick={startScanner} size="lg" className="gap-2 font-semibold">
              <Camera className="w-5 h-5" />
              Activate Camera Feed
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="outline" size="lg">
              Stop Camera
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enter QR Pass Token</CardTitle>
            <CardDescription>Type or paste the token provided on the student pass</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="e.g. SST-QR-12345 or HMAC token"
                className="font-mono text-sm"
              />
              <Button
                type="submit"
                disabled={!manualToken.trim() || validating}
                className="w-full"
              >
                {validating ? 'Validating Token...' : 'Verify Gate Pass'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Validation Result Card */}
      {result && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                Gate Pass Verified
              </span>
              <h3 className="text-xl font-bold">{result.booking.resourceName}</h3>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t text-sm">
            {result.student && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Student Info
                </p>
                <p className="font-semibold">{result.student.name || result.student.email}</p>
                {result.student.rollNumber && (
                  <p className="text-xs text-muted-foreground">Roll: {result.student.rollNumber}</p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Booking Status
              </p>
              <Badge variant="success">{result.booking.status}</Badge>
            </div>
          </div>

          {result.booking.items && result.booking.items.length > 0 && (
            <div className="p-3 rounded-lg border bg-card/60 space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-primary" />
                Issued Equipment Items:
              </p>
              <ul className="text-xs list-disc list-inside space-y-0.5">
                {result.booking.items.map((it, i) => (
                  <li key={i} className="font-semibold">
                    {it.name} (x{it.qty})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
