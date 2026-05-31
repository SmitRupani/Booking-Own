export default function EquipmentPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="text-2xl font-semibold">Equipment</h2>
      <p className="text-sm text-muted-foreground mt-2">Equipment items and kits. (UI scaffold)</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">Tennis Racket (placeholder)</div>
        <div className="rounded-lg border p-4">Basketball (placeholder)</div>
        <div className="rounded-lg border p-4">Volleyball Set (placeholder)</div>
      </div>
    </div>
  );
}
