import { specialties } from "@/lib/mock-data";

/** شرائح اختيار التخصص — نفس الكتلة في نموذج التسجيل ونموذج البروفايل. */
export function SpecialtyChips({
  spec,
  setSpec,
}: {
  spec: string;
  setSpec: (value: string) => void;
}) {
  return (
    <div className="mt-2 -mx-1 overflow-x-auto px-1">
      <div className="flex gap-2">
        {specialties.map((s) => (
          <button
            key={s.id}
            onClick={() => setSpec(s.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
              spec === s.id ? "gradient-primary text-white" : "bg-secondary"
            }`}
          >
            {s.emoji} {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
