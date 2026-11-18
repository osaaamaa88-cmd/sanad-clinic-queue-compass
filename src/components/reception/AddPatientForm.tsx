import { useState } from "react";

export type VisitType = "new" | "followup";

export function AddPatientForm({
  onSubmit,
}: {
  /** Returns true when the patient was recorded, false when nothing was added. */
  onSubmit: (name: string, phone: string, visitType: VisitType) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("new");

  const submit = async () => {
    if (!(await onSubmit(name, phone, visitType))) return;
    setName("");
    setPhone("");
    setVisitType("new");
  };

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4 print:hidden">
      <div>
        <label className="text-xs font-bold text-muted-foreground">اسم المريض</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: محمد أحمد"
          className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground">رقم الموبايل (اختياري)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01xxxxxxxxx"
          inputMode="tel"
          className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground">نوع الزيارة</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(
            [
              ["new", "كشف جديد"],
              ["followup", "استشارة"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setVisitType(v)}
              className={`rounded-xl py-2.5 text-xs font-bold ${
                visitType === v ? "gradient-primary text-white" : "border border-border bg-card"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={submit}
        className="w-full rounded-xl bg-success py-3 font-bold text-success-foreground"
      >
        اكتبه في الدفتر
      </button>
    </div>
  );
}
