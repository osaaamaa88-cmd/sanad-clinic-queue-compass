import { useEffect, useState } from "react";
import { ShieldPlus, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { loadVault, saveVault, type EmergencyVault } from "@/lib/offline-db";

type Form = Omit<EmergencyVault, "id" | "updatedAt">;
const empty: Form = { bloodType: "", allergies: "", chronic: "", contactName: "", contactPhone: "" };

/** بطاقة طوارئ محفوظة على الهاتف فقط وتعمل بدون إنترنت. */
export function EmergencyVaultCard() {
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadVault().then((v) => {
      if (!v) return setEditing(true);
      const { id: _id, updatedAt: _u, ...rest } = v;
      setForm(rest);
      setSaved(true);
    });
  }, []);

  const field = (k: keyof Form, label: string, type = "text") => (
    <label className="block text-xs font-bold text-muted-foreground">
      {label}
      <input
        type={type}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
      />
    </label>
  );

  return (
    <section className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <ShieldPlus className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">كارت الطوارئ</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <WifiOff className="h-3 w-3" /> محفوظ على موبايلك بس ويفتح من غير نت
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="min-h-11 px-3 text-xs font-bold text-primary">
            {saved ? "تعديل" : "املأ الكارت"}
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {field("bloodType", "فصيلة الدم")}
          {field("allergies", "حساسية من أدوية")}
          <div className="col-span-2">{field("chronic", "أمراض مزمنة")}</div>
          {field("contactName", "اسم قريب للطوارئ")}
          {field("contactPhone", "رقمه", "tel")}
          <button
            onClick={async () => {
              await saveVault(form);
              setSaved(true);
              setEditing(false);
              toast.success("اتحفظ كارت الطوارئ على موبايلك");
            }}
            className="col-span-2 min-h-11 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground"
          >
            حفظ
          </button>
        </div>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {[
            ["فصيلة الدم", form.bloodType],
            ["الحساسية", form.allergies],
            ["أمراض مزمنة", form.chronic],
            ["قريب للطوارئ", form.contactName],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-secondary p-2">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-bold">{v || "—"}</dd>
            </div>
          ))}
          {form.contactPhone && (
            <a href={`tel:${form.contactPhone}`} className="col-span-2 flex min-h-11 items-center justify-center rounded-xl bg-destructive text-sm font-extrabold text-destructive-foreground">
              اتصل بـ {form.contactName || form.contactPhone}
            </a>
          )}
        </dl>
      )}
    </section>
  );
}
