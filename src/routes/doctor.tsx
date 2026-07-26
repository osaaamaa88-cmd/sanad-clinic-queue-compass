import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Save, UserPlus, Zap, Clock, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  specialties,
  upsertClinic,
  getCurrentDoctorClinic,
  setCurrentDoctorId,
  type Clinic,
} from "@/lib/mock-data";

export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "سندي — لوحة الطبيب" }] }),
  component: Doctor,
});

function Doctor() {
  const [clinicId, setClinicId] = useState<string | undefined>(undefined);
  const [isVerified, setIsVerified] = useState(false);
  const [name, setName] = useState("");
  const [spec, setSpec] = useState(specialties[0].id);
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(false);
  const [saved, setSaved] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [secName, setSecName] = useState("");
  const [secPhone, setSecPhone] = useState("");
  const [secretaries, setSecretaries] = useState<{ name: string; phone: string }[]>([]);

  useEffect(() => {
    getCurrentDoctorClinic().then((c) => {
      if (c) hydrate(c);
    });
  }, []);

  const hydrate = (c: Clinic) => {
    setClinicId(c.id);
    setIsVerified(c.isVerified);
    setName(c.doctor);
    setSpec(c.specialtyId);
    setArea(c.area);
    setPhone(c.phone);
    setPrice(String(c.price));
    setAvailable(c.availableNow);
    // address is stored as one string; keep as-is in street for editing
    setStreet(c.address);
  };

  const save = async () => {
    if (!name.trim() || !phone.trim() || !area.trim()) {
      return;
    }
    const address = [street, building, floor].filter(Boolean).join("، ");
    const created = await upsertClinic({
      id: clinicId,
      doctor: name.trim(),
      specialtyId: spec,
      address: address || street.trim(),
      area: area.trim(),
      distanceKm: 0,
      price: Number(price) || 0,
      rating: 0,
      reviews: 0,
      availableNow: available,
      phone: phone.trim().replace(/^0/, "20"),
      nowServing: 0,
      yourNumber: 0,
      waitingCount: 0,
      lat: 30.0444,
      lng: 31.2357,
    });
    if (!created) return;
    const isNew = !clinicId;
    setClinicId(created.id);
    setIsVerified(created.isVerified);
    setCurrentDoctorId(created.id);
    setSaved(true);
    if (isNew) setJustSubmitted(true);
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
      {/* Verification status */}
      {clinicId && !isVerified && (
        <div className="mb-4 rounded-2xl border border-warning bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">حسابك قيد المراجعة والتوثيق</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                حسابك قيد المراجعة والتوثيق من قبل إدارة التطبيق، وسيتم تفعيله فور التأكد من البيانات.
                لحد ما يتم التوثيق، عيادتك مش هتظهر للمرضى في البحث أو الخريطة.
              </p>
            </div>
          </div>
        </div>
      )}
      {clinicId && isVerified && (
        <div className="mb-4 rounded-2xl border border-success bg-success/10 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/20 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">حسابك موثّق ✓</p>
              <p className="mt-1 text-xs text-muted-foreground">
                عيادتك ظاهرة للمرضى في البحث والخريطة.
              </p>
            </div>
          </div>
        </div>
      )}

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
        <Field label="اسم الطبيب" value={name} onChange={setName} placeholder="د. الاسم الكامل" />
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
        <Field label="المنطقة / الحي" value={area} onChange={setArea} placeholder="مثال: المهندسين" />
        <Field label="الشارع" value={street} onChange={setStreet} placeholder="اسم الشارع" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="العمارة" value={building} onChange={setBuilding} placeholder="عمارة رقم…" />
          <Field label="الدور" value={floor} onChange={setFloor} placeholder="الدور…" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground">رقم الموبايل (واتساب)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="01xxxxxxxxx"
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground">سعر الكشف (جنيه)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="مثال: 250"
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
        <Save className="h-5 w-5" /> {saved ? "تم الحفظ ✓" : clinicId ? "حفظ التعديلات" : "تسجيل العيادة"}
      </button>

      {justSubmitted && !isVerified && (
        <div className="mt-4 rounded-2xl border border-primary bg-primary-soft p-4 text-sm text-primary">
          تم تسجيل عيادتك بنجاح في فترة البيتا التجريبية، وحسابك قيد التفعيل من إدارة سندي.
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-bold text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
      />
    </div>
  );
}