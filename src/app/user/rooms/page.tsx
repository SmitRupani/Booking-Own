export default function RoomsPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="text-2xl font-semibold">Rooms</h2>
      <p className="text-sm text-muted-foreground mt-2">Meeting and study rooms. (UI scaffold)</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">Room 101 (placeholder)</div>
        <div className="rounded-lg border p-4">Room 102 (placeholder)</div>
        <div className="rounded-lg border p-4">Room 201 (placeholder)</div>
      </div>
    </div>
  );
}
