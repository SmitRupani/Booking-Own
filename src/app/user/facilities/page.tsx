export default function FacilitiesPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="text-2xl font-semibold">Facilities</h2>
      <p className="text-sm text-muted-foreground mt-2">List of sports grounds and courts. (UI scaffold)</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">Ground A (placeholder)</div>
        <div className="rounded-lg border p-4">Court 1 (placeholder)</div>
        <div className="rounded-lg border p-4">Court 2 (placeholder)</div>
      </div>
    </div>
  );
}
