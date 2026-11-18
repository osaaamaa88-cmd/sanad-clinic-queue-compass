import type { Profile } from "@/lib/nutrition-calc";

const ACTIVITY = [
  { v: 1.2, l: "قليل الحركة" },
  { v: 1.375, l: "نشاط خفيف" },
  { v: 1.55, l: "نشاط متوسط" },
  { v: 1.725, l: "نشاط عالي" },
];

const num =
  "w-full rounded-xl border border-border bg-background px-2 py-2 text-center text-sm font-bold";

export function ProfileForm({
  profile,
  target,
  onChange,
}: {
  profile: Profile;
  target: number;
  onChange: (p: Partial<Profile>) => void;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4">
      <h3 className="text-sm font-extrabold">
        احتياجك اليومي: <span className="text-primary">{target} سعر</span>
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <label>
          السن
          <input
            type="number"
            className={num}
            value={profile.age}
            onChange={(e) => onChange({ age: +e.target.value || 0 })}
          />
        </label>
        <label>
          الطول سم
          <input
            type="number"
            className={num}
            value={profile.height}
            onChange={(e) => onChange({ height: +e.target.value || 0 })}
          />
        </label>
        <label>
          الوزن كجم
          <input
            type="number"
            className={num}
            value={profile.weight}
            onChange={(e) => onChange({ weight: +e.target.value || 0 })}
          />
        </label>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["m", "f"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ sex: s })}
            className={`rounded-xl border py-2 text-xs font-bold ${profile.sex === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {s === "m" ? "ذكر" : "أنثى"}
          </button>
        ))}
      </div>
      <select
        value={profile.activity}
        onChange={(e) => onChange({ activity: +e.target.value })}
        className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      >
        {ACTIVITY.map((a) => (
          <option key={a.v} value={a.v}>
            {a.l}
          </option>
        ))}
      </select>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(
          [
            ["lose", "إنقاص"],
            ["keep", "تثبيت"],
            ["gain", "زيادة"],
          ] as const
        ).map(([g, l]) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange({ goal: g })}
            className={`rounded-xl border py-2 text-xs font-bold ${profile.goal === g ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {l} الوزن
          </button>
        ))}
      </div>
    </section>
  );
}
