import Card from '@/components/ui/Card';

export default function GuardScanner() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="text-2xl font-semibold">Guard Scanner</h2>
      <p className="text-sm text-muted-foreground mt-2">Scan QR codes to validate check-ins and check-outs.</p>

      <div className="mt-6">
        <Card>Scanner placeholder</Card>
      </div>
    </div>
  );
}
