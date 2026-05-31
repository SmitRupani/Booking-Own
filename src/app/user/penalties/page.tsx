import Card from '@/components/ui/Card';

export default function PenaltiesPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="text-2xl font-semibold">Rules & Penalties</h2>
      <p className="text-sm text-muted-foreground mt-2">Information about penalties for no-shows and damages.</p>

      <div className="mt-6">
        <Card>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>No-shows may result in penalties.</li>
            <li>Late returns may incur fees.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
