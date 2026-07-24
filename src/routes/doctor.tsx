import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Save, UserPlus, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { specialties } from "@/lib/mock-data";

export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "طبيبك — لوحة الطبيب" }] }),
  component: Doctor,
});

function Doctor() {
  const [name, setName] = useState("د. أحمد السيد");
  const [spec, setSpec] = useState("dental");
  const [street, setStreet] = useState("شارع الهرم");
  const [building, setBuilding] = useState("عمارة ٢٤");
  const [floor, setFloor] = useState("الدور الثالث");
  const [price, setPrice] = useState("200");
  const [available, setAvailable] = useState(true);
  const [saved, setSaved] = useState(false);
  const [secName, setSecName] = useState("");
  const [secPhone, setSecPhone] = useState("");
  const [secretaries, setSecretaries] = useState<{ name: string; phone: string }[]>([
    { name: "منى صابر", phone: "01011223344" },
  ]);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addSec = () => {
    if (!secName.trim()) return;
    setSecretaries((s) => [...s, { name: secName.trim(), phone: secPhone.trim() }]);
    setSecName("");
    setSecPhone("");
  };

  return (
    <AppShell title="لوحة الطبيب" subtitle="بروفايل عيادتك" backTo="/">
      {/* Availability */}
      <div className={`flex items-center gap-4 rounded-2xl p-4 shadow-soft ${
        available ? "gradient-primary text-white" : "bg-card border border-border"
      }`}>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
          available ? "bg-white/20" : "bg-primary-soft text-primary"
        }`}>
          <Zap className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{available ? "متاح الآن — طوارئ" : "العيادة مقفولة"}</p>
          <p className={`text-xs ${available ? "opacity-90" : "text-muted-foreground"}`}>
            {available ? "المرضى بيشوفوك في قايمة المتاح دلوقتي" : "فعّل عشان تظهر للمرضى فوراً"}
          </p>
        </div>
        <button
          onClick={() => setAvailable((v) => !v)}
          className={`relative h-7 w-12 rounded-full transition ${
            available ? "bg-white/30" : "bg-secondary"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              available ? "right-0.5" : "right-[calc(100%-1.625rem)]"
            }`}
          />
        </button>
      </div>

      {/* Profile form */}
      <h2 className="mt-6 text-base font-bold">بيانات العيادة</h2>
      <div className="mt-3 space-y-4 rounded-2xl border border-border bg-card p-4">
        <Field label="اسم الطبيب" value={name} onChange={setName} />
        <div>
          <label className="text-xs font-bold text-muted-foreground">التخصص</label>
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
        </div>
        <Field label="الشارع" value={street} onChange={setStreet} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="العمارة" value={building} onChange={setBuilding} />
          <Field label="الدور" value={floor} onChange={setFloor} />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground">سعر الكشف (جنيه)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Map picker */}
      <h2 className="mt-6 text-base font-bold">حدد الموقع على الخريطة</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative">
          <iframe
            title="اختيار موقع العيادة"
            className="h-56 w-full"
            loading="lazy"
            src="https://maps.google.com/maps?q=cairo%20egypt&z=13&output=embed"
          />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <MapPin className="h-10 w-10 fill-destructive text-destructive drop-shadow" />
          </div>
        </div>
        <div className="border-t border-border p-3 text-xs">
          <p className="text-muted-foreground">الإحداثيات المختارة</p>
          <p className="mt-0.5 font-bold">30.0131° شمالاً — 31.2089° شرقاً</p>
        </div>
      </div>

      {/* Secretaries */}
      <h2 className="mt-6 text-base font-bold">حسابات السكرتير</h2>
      <div className="mt-3 space-y-2">
        {secretaries.map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary">
              {s.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.phone}</p>
            </div>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">مفعّل</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 rounded-2xl border-2 border-dashed border-border p-3">
        <input
          value={secName}
          onChange={(e) => setSecName(e.target.value)}
          placeholder="اسم السكرتير"
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          value={secPhone}
          onChange={(e) => setSecPhone(e.target.value)}
          placeholder="رقم الموبايل"
          inputMode="tel"
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={addSec}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-sm font-bold"
        >
          <UserPlus className="h-4 w-4" /> إضافة حساب سكرتير
        </button>
      </div>

      {/* Save */}
      <button
        onClick={save}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft"
      >
        <Save className="h-5 w-5" /> {saved ? "تم الحفظ ✓" : "حفظ البيانات"}
      </button>
    </AppShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-bold text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
      />
    </div>
  );
}