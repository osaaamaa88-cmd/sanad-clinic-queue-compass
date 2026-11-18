export function LocationBadge({ approx }: { approx: boolean }) {
  return approx ? (
    <span className="rounded-full border border-dashed border-warning px-2 py-0.5 text-xs font-bold text-warning">
      📍 موقع تقريبي
    </span>
  ) : (
    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
      ✓ موقع مؤكد
    </span>
  );
}
